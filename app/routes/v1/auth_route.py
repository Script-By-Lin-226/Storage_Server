from starlette.requests import Request
from app.schemas.schema import UserRegister, UserLogin, ForgotPasswordRequest, ResetPasswordRequest
from app.services.auth_service import register_user, logout_user, login_user, forgot_password, reset_password
from fastapi import Depends, HTTPException, APIRouter
from app.core.database_utils import get_async_session

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
async def register_user_route(user_form: UserRegister, session = Depends(get_async_session)):
    return await register_user(user_form, session)

@router.post("/login")
async def login_route(user_form: UserLogin, session = Depends(get_async_session)):
    return await login_user(user_form, session)

@router.post("/logout")
async def logout_route(request: Request):
    return await logout_user(request)

@router.post("/forgot-password")
async def forgot_password_route(request: ForgotPasswordRequest, session = Depends(get_async_session)):
    return await forgot_password(request.email, session)

@router.post("/reset-password")
async def reset_password_route(request: ResetPasswordRequest, session = Depends(get_async_session)):
    return await reset_password(request.email, request.new_password, session)
