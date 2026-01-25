from fastapi import APIRouter, Depends
from starlette import status
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_utils import get_async_session

router = APIRouter(prefix="/user", tags=["User"])


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user(request: Request):
    """Get current authenticated user information"""
    user = getattr(request.state, "user", None)
    if not user:
        return {"error": "User not authenticated"}
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
