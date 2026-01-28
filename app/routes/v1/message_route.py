from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from starlette import status
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database_utils import get_async_session
from app.services.admin_service import require_admin
from app.services.message_service import (
    list_my_messages,
    send_user_message,
    mark_my_message_read,
    create_expiry_reminder_if_needed,
    admin_list_messages,
    admin_send_message,
    admin_mark_read,
)


router = APIRouter(tags=["Messages"])


class SendMessageRequest(BaseModel):
    content: str


@router.get("/messages/me", status_code=status.HTTP_200_OK)
async def list_my_messages_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(200, ge=1, le=1000),
):
    return await list_my_messages(request, session, limit=limit)


@router.post("/messages", status_code=status.HTTP_201_CREATED)
async def send_user_message_route(
    request: Request,
    body: SendMessageRequest,
    session: AsyncSession = Depends(get_async_session),
):
    return await send_user_message(request, body.content, session)


@router.patch("/messages/{message_id}/read", status_code=status.HTTP_200_OK)
async def mark_my_message_read_route(
    message_id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    return await mark_my_message_read(request, message_id, session)


@router.post("/messages/expiry-reminder/check", status_code=status.HTTP_200_OK)
async def expiry_reminder_check_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    days_before: int = Query(7, ge=1, le=60),
):
    return await create_expiry_reminder_if_needed(request, session, days_before=days_before)


# Admin endpoints
@router.get("/admin/messages", status_code=status.HTTP_200_OK)
async def admin_list_messages_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user_id: int | None = Query(None),
    limit: int = Query(500, ge=1, le=2000),
):
    require_admin(request)
    return await admin_list_messages(session, user_id=user_id, limit=limit)


@router.post("/admin/messages/{user_id}", status_code=status.HTTP_201_CREATED)
async def admin_send_message_route(
    user_id: int,
    request: Request,
    body: SendMessageRequest,
    session: AsyncSession = Depends(get_async_session),
):
    require_admin(request)
    return await admin_send_message(user_id, body.content, session)


@router.patch("/admin/messages/{message_id}/read", status_code=status.HTTP_200_OK)
async def admin_mark_read_route(
    message_id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    require_admin(request)
    return await admin_mark_read(message_id, session)

