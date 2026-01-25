import aiofiles, os, shutil
from fastapi import File, UploadFile, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.Database_Model import FileTable, UserQuotas
from app.core.config import settings
from app.services.quota_service import DEFAULT_QUOTA_BYTES
from starlette import status
from starlette.responses import JSONResponse, StreamingResponse
from typing import List, Optional
from datetime import datetime

# Cross-platform storage directory - configurable via environment variable
# Supports Linux LVM paths (e.g., /mnt/lvm-storage/uploads or /var/storage/uploads)
UPLOAD_DIR = Path(settings.upload_dir)
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True, mode=0o755)  # Ensure proper permissions for Linux
except PermissionError:
    # If permission denied, try without mode (Windows compatibility)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    import logging
    logging.error(f"Failed to create upload directory {UPLOAD_DIR}: {e}")
    raise

# Optimized chunk sizes for better performance
UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB chunks for upload
DOWNLOAD_CHUNK_SIZE = 10 * 1024 * 1024  # 10 MB chunks for download


def get_user_storage_dir(user_id: int, username: str) -> Path:
    """Get or create user-specific storage directory"""
    user_dir = UPLOAD_DIR / f"user_{user_id}_{username}"
    user_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    return user_dir


async def check_quota(user_id: int, file_size: int, session: AsyncSession) -> bool:
    """Check if user has enough quota for the file"""
    query = select(UserQuotas).where(UserQuotas.user_id == user_id)
    result = await session.execute(query)
    quota = result.scalar_one_or_none()
    
    if not quota:
        # If no quota exists, create one with default 10GB
        quota = UserQuotas(
            user_id=user_id,
            max_storage_size=DEFAULT_QUOTA_BYTES,
            used_storage_size=0
        )
        session.add(quota)
        await session.flush()
    
    # Check if adding this file would exceed quota
    if quota.used_storage_size + file_size > quota.max_storage_size:
        return False
    return True


async def update_quota(user_id: int, file_size: int, session: AsyncSession, operation: str = "add"):
    """Update user's quota usage"""
    query = select(UserQuotas).where(UserQuotas.user_id == user_id)
    result = await session.execute(query)
    quota = result.scalar_one_or_none()
    
    if quota:
        if operation == "add":
            quota.used_storage_size += file_size
        elif operation == "subtract":
            quota.used_storage_size = max(0, quota.used_storage_size - file_size)
        await session.flush()


async def upload_file(request: Request, session: AsyncSession, file: UploadFile = File(...)):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

    # Get user-specific storage directory
    user_dir = get_user_storage_dir(user.id, user.username)
    
    # Generate unique filename to avoid conflicts
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = user_dir / safe_filename

    file_size = 0
    temp_chunks = []  # Store chunks temporarily for quota check
    quota_checked = False
    
    try:
        # Read file in chunks and store temporarily
        while chunk := await file.read(UPLOAD_CHUNK_SIZE):
            temp_chunks.append(chunk)
            file_size += len(chunk)
            
            # Check quota periodically (every 10MB or at the end) to avoid too many DB queries
            check_interval = 10 * 1024 * 1024  # 10 MB
            should_check = not quota_checked or (file_size % check_interval < UPLOAD_CHUNK_SIZE)
            
            if should_check:
                query = select(UserQuotas).where(UserQuotas.user_id == user.id)
                result = await session.execute(query)
                quota = result.scalar_one_or_none()
                
                if not quota:
                    # Create quota if doesn't exist
                    quota = UserQuotas(
                        user_id=user.id,
                        max_storage_size=DEFAULT_QUOTA_BYTES,
                        used_storage_size=0
                    )
                    session.add(quota)
                    await session.flush()
                
                # Check if this would exceed quota
                if quota.used_storage_size + file_size > quota.max_storage_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Quota exceeded. You have {quota.max_storage_size / (1024**3):.2f} GB quota, "
                               f"currently using {quota.used_storage_size / (1024**3):.2f} GB. "
                               f"This file ({file_size / (1024**3):.2f} GB) would exceed your quota."
                    )
                quota_checked = True
        
        # Write file to disk
        async with aiofiles.open(file_path, "wb") as out_file:
            for chunk in temp_chunks:
                await out_file.write(chunk)
        
        # Update quota after successful upload
        await update_quota(user.id, file_size, session, "add")
        
    except HTTPException:
        # Clean up partial file on quota error
        if file_path.exists():
            file_path.unlink()
        raise
    except Exception as e:
        # Clean up partial file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {str(e)}")

    # Store in DB
    new_file = FileTable(
        owner_id=user.id,
        filename=file.filename,
        file_path=str(file_path),
    )
    session.add(new_file)
    await session.commit()
    await session.refresh(new_file)

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": "File uploaded successfully",
            "file_id": new_file.id,
            "filename": file.filename,
            "size": file_size,
            "uploaded_at": new_file.created_at.isoformat() if new_file.created_at else None
        }
    )


async def download_file(id: int, session: AsyncSession, request: Optional[Request] = None):
    # Check authentication if request is provided
    if request:
        user = getattr(request.state, "user", None)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")
    
    q = select(FileTable).where(FileTable.id == id)
    result = await session.execute(q)
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Check ownership if authenticated
    if request:
        user = getattr(request.state, "user", None)
        if user and file.owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = Path(file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    # Optimized async streaming response with larger chunks
    async def file_iterator(path):
        async with aiofiles.open(path, "rb") as f:
            while chunk := await f.read(DOWNLOAD_CHUNK_SIZE):
                yield chunk

    # Get file size for Content-Length header
    file_size = file_path.stat().st_size
    
    return StreamingResponse(
        file_iterator(file_path),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={file.filename}",
            "Content-Length": str(file_size)
        }
    )

async def view_file_size(id: int, session: AsyncSession, request: Optional[Request] = None):
    # Fetch file info from DB
    query = select(FileTable).where(FileTable.id == id)
    result = await session.execute(query)
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Check ownership if authenticated
    if request:
        user = getattr(request.state, "user", None)
        if user and file.owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = Path(file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    stat = os.stat(file_path)
    size_bytes = stat.st_size

    # Format file size
    def format_size(size: int) -> dict:
        size_kb = round(size / 1024, 2)
        size_mb = round(size / 1024 ** 2, 2)
        size_gb = round(size / 1024 ** 3, 2)
        
        if size_gb >= 1:
            return {"value": size_gb, "unit": "GB", "formatted": f"{size_gb} GB"}
        elif size_mb >= 1:
            return {"value": size_mb, "unit": "MB", "formatted": f"{size_mb} MB"}
        elif size_kb >= 1:
            return {"value": size_kb, "unit": "KB", "formatted": f"{size_kb} KB"}
        else:
            return {"value": size, "unit": "B", "formatted": f"{size} B"}

    size_info = format_size(size_bytes)
    
    # Get file extension
    file_ext = file_path.suffix.lower() if file_path.suffix else "unknown"

    return {
        "id": file.id,
        "filename": file.filename,
        "size": size_info,
        "size_bytes": size_bytes,
        "file_path": file.file_path,
        "extension": file_ext,
        "created_at": file.created_at.isoformat() if file.created_at else None,
        "updated_at": file.updated_at.isoformat() if file.updated_at else None,
        "owner_id": file.owner_id
    }


async def list_files(session: AsyncSession, request: Request, skip: int = 0, limit: int = 100):
    """List all files for the authenticated user"""
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

    query = select(FileTable).where(FileTable.owner_id == user.id).offset(skip).limit(limit)
    result = await session.execute(query)
    files = result.scalars().all()

    file_list = []
    for file in files:
        file_path = Path(file.file_path)
        if file_path.exists():
            stat = os.stat(file_path)
            size_bytes = stat.st_size
            
            def format_size(size: int) -> str:
                size_mb = round(size / 1024 ** 2, 2)
                size_gb = round(size / 1024 ** 3, 2)
                if size_gb >= 1:
                    return f"{size_gb} GB"
                elif size_mb >= 1:
                    return f"{size_mb} MB"
                else:
                    return f"{round(size / 1024, 2)} KB"
            
            file_list.append({
                "id": file.id,
                "filename": file.filename,
                "size": format_size(size_bytes),
                "size_bytes": size_bytes,
                "extension": file_path.suffix.lower() if file_path.suffix else "unknown",
                "created_at": file.created_at.isoformat() if file.created_at else None,
                "updated_at": file.updated_at.isoformat() if file.updated_at else None,
            })

    # Get total count
    count_query = select(func.count(FileTable.id)).where(FileTable.owner_id == user.id)
    total_result = await session.execute(count_query)
    total = total_result.scalar()

    return {
        "files": file_list,
        "total": total,
        "skip": skip,
        "limit": limit
    }


async def delete_file(id: int, session: AsyncSession, request: Request):
    """Delete a file"""
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

    query = select(FileTable).where(FileTable.id == id)
    result = await session.execute(query)
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_path = Path(file.file_path)
    
    # Get file size before deletion for quota update
    file_size = 0
    if file_path.exists():
        try:
            file_size = file_path.stat().st_size
            file_path.unlink()
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete file: {str(e)}")

    # Update quota (subtract file size)
    if file_size > 0:
        await update_quota(user.id, file_size, session, "subtract")

    # Delete from database
    await session.delete(file)
    await session.commit()

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "File deleted successfully", "file_id": id, "filename": file.filename}
    )


async def rename_file(id: int, new_filename: str, session: AsyncSession, request: Request):
    """Rename a file"""
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

    query = select(FileTable).where(FileTable.id == id)
    result = await session.execute(query)
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    old_file_path = Path(file.file_path)
    if not old_file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    # Get file extension from old filename
    old_ext = old_file_path.suffix
    new_ext = Path(new_filename).suffix
    
    # Preserve extension if not provided
    if not new_ext:
        new_filename = new_filename + old_ext

    # Create new file path
    new_file_path = old_file_path.parent / new_filename

    # Check if new filename already exists
    if new_file_path.exists() and new_file_path != old_file_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File with this name already exists")

    try:
        # Rename file on disk
        old_file_path.rename(new_file_path)
        
        # Update database
        file.filename = new_filename
        file.file_path = str(new_file_path)
        file.updated_at = datetime.now()
        
        await session.commit()
        await session.refresh(file)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to rename file: {str(e)}")

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": "File renamed successfully",
            "file_id": file.id,
            "old_filename": file.filename,
            "new_filename": new_filename
        }
    )


async def get_directory_stats(request: Request, session: AsyncSession):
    """Get user quota and storage statistics (not full disk usage)"""
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

    # Get user's quota
    quota_query = select(UserQuotas).where(UserQuotas.user_id == user.id)
    quota_result = await session.execute(quota_query)
    quota = quota_result.scalar_one_or_none()
    
    # If no quota exists, create one with default 10GB
    if not quota:
        quota = UserQuotas(
            user_id=user.id,
            max_storage_size=DEFAULT_QUOTA_BYTES,
            used_storage_size=0
        )
        session.add(quota)
        await session.flush()

    # Get all files for the user
    query = select(FileTable).where(FileTable.owner_id == user.id)
    result = await session.execute(query)
    files = result.scalars().all()

    total_size = 0
    file_count = 0
    file_types = {}

    for file in files:
        file_path = Path(file.file_path)
        if file_path.exists():
            stat = os.stat(file_path)
            total_size += stat.st_size
            file_count += 1
            
            # Count by file type
            ext = file_path.suffix.lower() if file_path.suffix else "unknown"
            file_types[ext] = file_types.get(ext, 0) + 1

    # Use quota information instead of disk usage
    quota_total = quota.max_storage_size
    quota_used = quota.used_storage_size
    quota_free = max(0, quota_total - quota_used)
    
    # Calculate percentages based on quota
    used_percentage = round((quota_used / quota_total) * 100, 2) if quota_total > 0 else 0
    free_percentage = round((quota_free / quota_total) * 100, 2) if quota_total > 0 else 0

    def format_bytes(bytes_val: int) -> dict:
        gb = round(bytes_val / 1024 ** 3, 2)
        mb = round(bytes_val / 1024 ** 2, 2)
        if gb >= 1:
            return {"value": gb, "unit": "GB", "formatted": f"{gb} GB"}
        elif mb >= 1:
            return {"value": mb, "unit": "MB", "formatted": f"{mb} MB"}
        else:
            return {"value": round(bytes_val / 1024, 2), "unit": "KB", "formatted": f"{round(bytes_val / 1024, 2)} KB"}

    return {
        "user_storage": {
            "total_files": file_count,
            "total_size": format_bytes(total_size),
            "total_size_bytes": total_size
        },
        "quota": {
            "total": format_bytes(quota_total),
            "total_bytes": quota_total,
            "used": format_bytes(quota_used),
            "used_bytes": quota_used,
            "free": format_bytes(quota_free),
            "free_bytes": quota_free,
            "free_percentage": free_percentage,
            "used_percentage": used_percentage
        },
        "file_types": file_types
    }
