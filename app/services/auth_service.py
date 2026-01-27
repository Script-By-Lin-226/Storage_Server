from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from starlette import status
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import HTTPException

from app.models.Database_Model import UserTable, UserQuotas
from app.security.password_security import get_password_hash , verify_password
from app.security.jwt import create_token, decode_token
from app.core.redis_client import redis_cli
from app.schemas.schema import UserRegister , UserLogin
from app.services.quota_service import setup_user_storage, DEFAULT_QUOTA_BYTES
from app.services.file_service import UPLOAD_DIR
import logging

logger = logging.getLogger(__name__)

async def register_user(user_form: UserRegister, session: AsyncSession):
    if not user_form:
        return {"message":"Form cannot be empty!"}

    query = select(UserTable).where(UserTable.email == user_form.email)
    result = await session.execute(query)
    user = result.scalars().all()

    hashed_password = await get_password_hash(user_form.password)

    if user:
        return {"message":"User already exists!"}

    # Create new user
    new_user = UserTable(
        username=user_form.username,
        email=user_form.email,
        hashed_password=hashed_password,
        role=user_form.role,
    )
    session.add(new_user)
    await session.flush()  # Flush to get the user ID without committing
    
    # Create user quota (10GB default)
    user_quota = UserQuotas(
        user_id=new_user.id,
        max_storage_size=DEFAULT_QUOTA_BYTES,  # 10 GB
        used_storage_size=0,  # Initially no storage used
    )
    session.add(user_quota)
    
    # Setup user storage directory and ACL
    try:
        user_dir, acl_success = await setup_user_storage(
            new_user.id,
            new_user.username,
            UPLOAD_DIR
        )
        if acl_success:
            logger.info(f"Successfully set up storage and ACL for user {new_user.id} at {user_dir}")
        else:
            logger.warning(f"Storage directory created for user {new_user.id} but ACL setup had issues")
    except Exception as e:
        logger.error(f"Failed to setup storage for user {new_user.id}: {e}")
        # Continue with registration even if storage setup fails
        # The directory can be created manually later
    
    await session.commit()
    await session.refresh(new_user)

    return {
        "message": "User created successfully!",
        "user_id": new_user.id,
        "quota_gb": DEFAULT_QUOTA_BYTES / (1024 ** 3),
        "storage_setup": "completed"
    }

async def login_user(user_login: UserLogin, session: AsyncSession):
    query = select(UserTable).where(UserTable.email == user_login.email)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(user_login.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    # Issue short-lived access token and long-lived refresh token
    access_token = await create_token({"sub": str(user.id)}, token_type="access")
    refresh_token = await create_token({"sub": str(user.id)}, token_type="refresh")

    """try:
        await redis_cli.set(f"refresh_token:{user.id}", refresh_token, ex=7 * 24 * 3600)
    except Exception as err:
        return {"message":f"Error in Redis connection! {err}"}"""

    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"access_token": access_token, "refresh_token": refresh_token}
    )
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax", max_age=7 * 24 * 3600)
    response.set_cookie("access_token", access_token, httponly=True, samesite="lax",max_age=30 * 60)
    response.headers["Authorization"] = f"Bearer {access_token}"
    response.headers["X-Refresh-Token"] = f"{refresh_token}"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"

    return response

async def forgot_password(email: str, session: AsyncSession):
    """Handle forgot password request"""
    query = select(UserTable).where(UserTable.email == email)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if user exists for security
        return {
            "message": "If an account with that email exists, a password reset link has been sent."
        }
    
    # In a real application, you would:
    # 1. Generate a reset token
    # 2. Store it in database with expiration
    # 3. Send email with reset link
    # For now, we'll just return a success message
    
    return {
        "message": "If an account with that email exists, a password reset link has been sent.",
        "email": email  # Only for development, remove in production
    }

async def reset_password(email: str, new_password: str, session: AsyncSession):
    """Reset user password"""
    query = select(UserTable).where(UserTable.email == email)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Validate password
    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    
    # Hash and update password
    hashed_password = await get_password_hash(new_password)
    user.hashed_password = hashed_password
    await session.commit()
    await session.refresh(user)
    
    return {
        "message": "Password reset successfully",
        "user_id": user.id,
        "username": user.username
    }

async def logout_user(request: Request):
    # user = getattr(request.state, "user", None) - after adding auth middleware
    user_tok = request.cookies.get("access_token")
    if not user_tok:
        return {"message":"User does not login!"}

    """try:
        await redis_cli.delete(f"refresh_token:{user.id}")
    except Exception as err:
        return {"message":f"Error in Redis connection! {err}"}"""

    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message":"Successfully logged out!"}
    )
    response.delete_cookie("refresh_token")
    response.delete_cookie("access_token")

    return response

