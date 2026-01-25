from fastapi import APIRouter, Depends, Query, HTTPException
from starlette import status
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_utils import get_async_session
from app.services.admin_service import (
    require_admin,
    list_all_users,
    get_user_details,
    update_user_quota,
    update_user_role,
    delete_user,
    reset_user_password,
    get_admin_stats
)
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/admin", tags=["Admin"])


class UpdateQuotaRequest(BaseModel):
    quota_gb: float


class UpdateRoleRequest(BaseModel):
    role: str


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get admin dashboard statistics"""
    require_admin(request)
    return await get_admin_stats(session)


@router.get("/users", status_code=status.HTTP_200_OK)
async def list_users_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None)
):
    """List all users (admin only)"""
    require_admin(request)
    return await list_all_users(session, skip, limit, search)


@router.get("/users/{user_id}", status_code=status.HTTP_200_OK)
async def get_user_route(
    user_id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed user information (admin only)"""
    require_admin(request)
    return await get_user_details(user_id, session)


@router.patch("/users/{user_id}/quota", status_code=status.HTTP_200_OK)
async def update_quota_route(
    user_id: int,
    quota_request: UpdateQuotaRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Update user's storage quota (admin only)"""
    require_admin(request)
    if quota_request.quota_gb <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quota must be greater than 0")
    return await update_user_quota(user_id, quota_request.quota_gb, session)


@router.patch("/users/{user_id}/role", status_code=status.HTTP_200_OK)
async def update_role_route(
    user_id: int,
    role_request: UpdateRoleRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Update user's role (admin only)"""
    require_admin(request)
    return await update_user_role(user_id, role_request.role, session)


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_password_route(
    user_id: int,
    password_request: ResetPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Reset user's password (admin only)"""
    require_admin(request)
    if len(password_request.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    return await reset_user_password(user_id, password_request.new_password, session)


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user_route(
    user_id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a user and all their files (admin only)"""
    require_admin(request)
    return await delete_user(user_id, session, request)
