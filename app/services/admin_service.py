from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from starlette import status
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import HTTPException
from pathlib import Path
import shutil
from datetime import datetime, timedelta, timezone

from app.models.Database_Model import UserTable, UserQuotas, FileTable, PremiumPurchase
from app.security.password_security import get_password_hash
from app.services.quota_service import DEFAULT_QUOTA_BYTES, setup_user_storage
from app.services.file_service import UPLOAD_DIR
import logging

logger = logging.getLogger(__name__)


def require_admin(request: Request):
    """Helper to check if user is admin"""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def list_all_users(session: AsyncSession, skip: int = 0, limit: int = 100, search: str = None):
    """List all users with their quota information"""
    query = select(UserTable)
    
    # Add search filter if provided
    if search:
        search_filter = or_(
            UserTable.username.ilike(f"%{search}%"),
            UserTable.email.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    # Get total count
    count_query = select(func.count(UserTable.id))
    if search:
        count_query = count_query.where(search_filter)
    total_result = await session.execute(count_query)
    total = total_result.scalar()
    
    # Get users with pagination
    query = query.offset(skip).limit(limit).order_by(UserTable.created_at.desc())
    result = await session.execute(query)
    users = result.scalars().all()
    
    user_list = []
    for user in users:
        # Get quota information
        quota_query = select(UserQuotas).where(UserQuotas.user_id == user.id)
        quota_result = await session.execute(quota_query)
        quota = quota_result.scalar_one_or_none()
        
        # Get file count
        file_count_query = select(func.count(FileTable.id)).where(FileTable.owner_id == user.id)
        file_count_result = await session.execute(file_count_query)
        file_count = file_count_result.scalar()
        
        user_list.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "quota": {
                "max_storage_gb": round(quota.max_storage_size / (1024**3), 2) if quota else 0,
                "used_storage_gb": round(quota.used_storage_size / (1024**3), 2) if quota else 0,
                "max_storage_bytes": quota.max_storage_size if quota else 0,
                "used_storage_bytes": quota.used_storage_size if quota else 0,
            } if quota else None,
            "file_count": file_count,
        })
    
    return {
        "users": user_list,
        "total": total,
        "skip": skip,
        "limit": limit
    }


async def get_user_details(user_id: int, session: AsyncSession):
    """Get detailed information about a specific user"""
    query = select(UserTable).where(UserTable.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Get quota
    quota_query = select(UserQuotas).where(UserQuotas.user_id == user.id)
    quota_result = await session.execute(quota_query)
    quota = quota_result.scalar_one_or_none()
    
    # Get files
    files_query = select(FileTable).where(FileTable.owner_id == user.id)
    files_result = await session.execute(files_query)
    files = files_result.scalars().all()
    
    # Calculate total file size
    total_size = 0
    for file in files:
        file_path = Path(file.file_path)
        if file_path.exists():
            total_size += file_path.stat().st_size
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "quota": {
            "max_storage_gb": round(quota.max_storage_size / (1024**3), 2) if quota else 0,
            "used_storage_gb": round(quota.used_storage_size / (1024**3), 2) if quota else 0,
            "max_storage_bytes": quota.max_storage_size if quota else 0,
            "used_storage_bytes": quota.used_storage_size if quota else 0,
        } if quota else None,
        "files": {
            "count": len(files),
            "total_size_gb": round(total_size / (1024**3), 2),
            "total_size_bytes": total_size,
        }
    }


async def update_user_quota(user_id: int, new_quota_gb: float, session: AsyncSession):
    """Update user's storage quota"""
    query = select(UserTable).where(UserTable.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Get or create quota
    quota_query = select(UserQuotas).where(UserQuotas.user_id == user.id)
    quota_result = await session.execute(quota_query)
    quota = quota_result.scalar_one_or_none()
    
    new_quota_bytes = int(new_quota_gb * 1024 * 1024 * 1024)
    
    if quota:
        quota.max_storage_size = new_quota_bytes
    else:
        quota = UserQuotas(
            user_id=user.id,
            max_storage_size=new_quota_bytes,
            used_storage_size=0
        )
        session.add(quota)
    
    await session.commit()
    await session.refresh(quota)
    
    return {
        "message": "Quota updated successfully",
        "user_id": user.id,
        "new_quota_gb": new_quota_gb,
        "new_quota_bytes": new_quota_bytes
    }


async def update_user_role(user_id: int, new_role: str, session: AsyncSession):
    """Update user's role"""
    if new_role not in ["admin", "user"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role. Must be 'admin' or 'user'")
    
    query = select(UserTable).where(UserTable.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    old_role = user.role
    user.role = new_role
    await session.commit()
    await session.refresh(user)
    
    return {
        "message": "User role updated successfully",
        "user_id": user.id,
        "old_role": old_role,
        "new_role": new_role
    }


async def delete_user(user_id: int, session: AsyncSession, request: Request):
    """Delete a user and all their files"""
    admin_user = require_admin(request)
    
    # Prevent admin from deleting themselves
    if user_id == admin_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    
    query = select(UserTable).where(UserTable.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Get all user files
    files_query = select(FileTable).where(FileTable.owner_id == user.id)
    files_result = await session.execute(files_query)
    files = files_result.scalars().all()
    
    # Delete files from disk
    user_dir = UPLOAD_DIR / f"user_{user.id}_{user.username}"
    deleted_files = 0
    for file in files:
        file_path = Path(file.file_path)
        if file_path.exists():
            try:
                file_path.unlink()
                deleted_files += 1
            except Exception as e:
                logger.error(f"Failed to delete file {file_path}: {e}")
    
    # Delete user directory if it exists
    if user_dir.exists():
        try:
            shutil.rmtree(user_dir)
        except Exception as e:
            logger.error(f"Failed to delete user directory {user_dir}: {e}")
    
    # Delete quota
    quota_query = select(UserQuotas).where(UserQuotas.user_id == user.id)
    quota_result = await session.execute(quota_query)
    quota = quota_result.scalar_one_or_none()
    if quota:
        await session.delete(quota)
    
    # Delete user (cascade will delete files from DB)
    await session.delete(user)
    await session.commit()
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "username": user.username,
        "deleted_files": deleted_files
    }


async def reset_user_password(user_id: int, new_password: str, session: AsyncSession):
    """Reset user's password (admin only)"""
    query = select(UserTable).where(UserTable.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    hashed_password = await get_password_hash(new_password)
    user.hashed_password = hashed_password
    await session.commit()
    await session.refresh(user)
    
    return {
        "message": "Password reset successfully",
        "user_id": user.id,
        "username": user.username
    }


async def get_admin_stats(session: AsyncSession):
    """Get overall statistics for admin dashboard"""
    # Total users
    total_users_query = select(func.count(UserTable.id))
    total_users_result = await session.execute(total_users_query)
    total_users = total_users_result.scalar()
    
    # Total admins
    admin_count_query = select(func.count(UserTable.id)).where(UserTable.role == "admin")
    admin_count_result = await session.execute(admin_count_query)
    admin_count = admin_count_result.scalar()
    
    # Total files
    total_files_query = select(func.count(FileTable.id))
    total_files_result = await session.execute(total_files_query)
    total_files = total_files_result.scalar()
    
    # Total storage used
    quota_query = select(func.sum(UserQuotas.used_storage_size))
    quota_result = await session.execute(quota_query)
    total_storage_used = quota_result.scalar() or 0
    
    # Total quota allocated
    quota_allocated_query = select(func.sum(UserQuotas.max_storage_size))
    quota_allocated_result = await session.execute(quota_allocated_query)
    total_quota_allocated = quota_allocated_result.scalar() or 0
    
    # Get disk usage
    try:
        disk_usage = shutil.disk_usage(UPLOAD_DIR)
        total_disk = disk_usage.total
        used_disk = disk_usage.used
        free_disk = disk_usage.free
    except Exception:
        total_disk = 0
        used_disk = 0
        free_disk = 0
    
    def format_bytes(bytes_val: int) -> dict:
        gb = round(bytes_val / 1024 ** 3, 2)
        mb = round(bytes_val / 1024 ** 2, 2)
        if gb >= 1:
            return {"value": gb, "unit": "GB", "formatted": f"{gb} GB"}
        elif mb >= 1:
            return {"value": mb, "unit": "MB", "formatted": f"{mb} MB"}
        else:
            return {"value": round(bytes_val / 1024, 2), "unit": "KB", "formatted": f"{round(bytes_val / 1024, 2)} KB"}
    
    # Premium purchases summary
    pending_purchases_q = select(func.count(PremiumPurchase.id)).where(PremiumPurchase.status == "pending")
    pending_purchases_res = await session.execute(pending_purchases_q)
    pending_purchases = pending_purchases_res.scalar() or 0

    total_purchases_q = select(func.count(PremiumPurchase.id))
    total_purchases_res = await session.execute(total_purchases_q)
    total_purchases = total_purchases_res.scalar() or 0

    return {
        "users": {
            "total": total_users,
            "admins": admin_count,
            "regular_users": total_users - admin_count
        },
        "files": {
            "total": total_files
        },
        "storage": {
            "total_used": format_bytes(total_storage_used),
            "total_used_bytes": total_storage_used,
            "total_quota_allocated": format_bytes(total_quota_allocated),
            "total_quota_allocated_bytes": total_quota_allocated,
        },
        "disk": {
            "total": format_bytes(total_disk),
            "total_bytes": total_disk,
            "used": format_bytes(used_disk),
            "used_bytes": used_disk,
            "free": format_bytes(free_disk),
            "free_bytes": free_disk,
        },
        "premium": {
            "total_purchases": total_purchases,
            "pending_purchases": pending_purchases,
        },
    }


async def list_premium_purchases(session: AsyncSession, status_filter: str | None = None):
    """
    List premium purchases for admin review.
    Optionally filter by status ("pending", "approved", "rejected").

    NOTE: We avoid lazy-loading relationships in async context by joining UserTable
    explicitly and selecting both models.
    """
    query = (
        select(PremiumPurchase, UserTable)
        .join(UserTable, PremiumPurchase.user_id == UserTable.id)
        .order_by(PremiumPurchase.created_at.desc())
    )
    if status_filter:
        query = query.where(PremiumPurchase.status == status_filter)

    result = await session.execute(query)
    rows = result.all()

    now = datetime.now(timezone.utc)
    data = []
    for purchase, user in rows:
        data.append(
            {
                "id": purchase.id,
                "user_id": purchase.user_id,
                "username": user.username if user else None,
                "email": user.email if user else None,
                "plan_name": purchase.plan_name,
                "storage_gb": purchase.storage_gb,
                "price_ks": purchase.price_ks,
                "phone_msisdn": purchase.phone_msisdn,
                "payment_method": purchase.payment_method,
                "status": purchase.status,
                "expires_at": purchase.expires_at.isoformat() if purchase.expires_at else None,
                "is_active": purchase.status == "approved"
                and purchase.expires_at is not None
                and purchase.expires_at > now,
                "transcript_uploaded": bool(purchase.transcript_path),
                "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
            }
        )

    return {"purchases": data}


async def update_premium_status(purchase_id: int, new_status: str, session: AsyncSession):
    """
    Approve or reject a premium purchase.
    """
    if new_status not in {"pending", "approved", "rejected"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    query = select(PremiumPurchase).where(PremiumPurchase.id == purchase_id)
    res = await session.execute(query)
    purchase = res.scalar_one_or_none()

    if not purchase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Premium purchase not found")

    old_status = purchase.status
    purchase.status = new_status

    # If this is an approval and was not already approved, set expiry and upgrade quota now
    if new_status == "approved" and old_status != "approved" and purchase.price_ks > 0:
        # Extend expiry to at least 30 days from now (stacking renewals)
        new_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        if purchase.expires_at is None or purchase.expires_at < new_expiry:
            purchase.expires_at = new_expiry

        # Increment user's quota by this package size instead of overwriting
        quota_q = select(UserQuotas).where(UserQuotas.user_id == purchase.user_id)
        res = await session.execute(quota_q)
        quota = res.scalars().first()
        increment_bytes = purchase.storage_gb * 1024 * 1024 * 1024
        if quota:
            current_max = quota.max_storage_size or 0
            quota.max_storage_size = current_max + increment_bytes
        else:
            quota = UserQuotas(
                user_id=purchase.user_id,
                max_storage_size=increment_bytes,
                used_storage_size=0,
            )
            session.add(quota)

    await session.commit()
    await session.refresh(purchase)

    return {
        "message": "Premium status updated",
        "id": purchase.id,
        "old_status": old_status,
        "new_status": purchase.status,
    }
