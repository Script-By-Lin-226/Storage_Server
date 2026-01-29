from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import HTTPException
from starlette import status
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.models.Database_Model import UserMessage, UserTable, PremiumPurchase


def _require_user(request: Request) -> UserTable:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


async def list_my_messages(request: Request, session: AsyncSession, limit: int = 200):
    user = _require_user(request)
    q = (
        select(UserMessage)
        .where(UserMessage.user_id == user.id)
        .order_by(desc(UserMessage.created_at))
        .limit(limit)
    )
    res = await session.execute(q)
    items = res.scalars().all()
    return {
        "messages": [
            {
                "id": m.id,
                "user_id": m.user_id,
                "sender": m.sender,
                "message_type": m.message_type,
                "content": m.content,
                "related_expires_at": m.related_expires_at.isoformat() if m.related_expires_at else None,
                "read_by_user": m.read_by_user,
                "read_by_admin": m.read_by_admin,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in items
        ]
    }


async def send_user_message(request: Request, content: str, session: AsyncSession):
    user = _require_user(request)
    content = (content or "").strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")

    msg = UserMessage(
        user_id=user.id,
        sender="user",
        message_type="general",
        content=content,
        read_by_user=True,
        read_by_admin=False,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return {"message": "Sent", "id": msg.id}


async def mark_my_message_read(request: Request, message_id: int, session: AsyncSession):
    user = _require_user(request)
    q = select(UserMessage).where(UserMessage.id == message_id, UserMessage.user_id == user.id)
    res = await session.execute(q)
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    msg.read_by_user = True
    await session.commit()
    return {"message": "OK"}


def _expiry_reminder_template(service_name: str, expiration_date: str) -> str:
    return (
        f"We wanted to remind you that your subscription for {service_name} will expire on {expiration_date}.\n\n"
        "To avoid interruption:\n"
        " • Renew Now\n"
        " • Cancel Subscription: Contact admin\n\n"
        "Thank you for choosing KTT!\n\n"
        "If you have any questions, feel free to contact our support team.\n\n"
        "— Kyike Tar Tein Team"
    )


async def create_expiry_reminder_if_needed(
    request: Request,
    session: AsyncSession,
    days_before: int = 7,
):
    """
    Create a system expiry reminder message when an approved subscription is near expiry.
    Dedupe by (user_id, message_type=expiry_reminder, related_expires_at).
    """
    user = _require_user(request)
    now = datetime.now(timezone.utc)
    threshold = now + timedelta(days=days_before)

    q = (
        select(PremiumPurchase)
        .where(
            PremiumPurchase.user_id == user.id,
            PremiumPurchase.status == "approved",
            PremiumPurchase.expires_at.is_not(None),
        )
        .order_by(desc(PremiumPurchase.expires_at))
        .limit(1)
    )
    res = await session.execute(q)
    purchase = res.scalar_one_or_none()
    if not purchase or not purchase.expires_at:
        return {"created": False, "reason": "no_active_purchase"}

    if purchase.expires_at <= now:
        return {"created": False, "reason": "already_expired"}

    if purchase.expires_at > threshold:
        return {"created": False, "reason": "not_near_expiry", "expires_at": purchase.expires_at.isoformat()}

    # Dedupe: if we already created reminder for this exact expires_at, skip
    dedupe_q = select(UserMessage).where(
        UserMessage.user_id == user.id,
        UserMessage.message_type == "expiry_reminder",
        UserMessage.related_expires_at == purchase.expires_at,
    )
    dedupe_res = await session.execute(dedupe_q)
    existing = dedupe_res.scalar_one_or_none()
    if existing:
        return {"created": False, "reason": "already_exists", "expires_at": purchase.expires_at.isoformat()}

    expires_str = purchase.expires_at.date().isoformat()
    msg = UserMessage(
        user_id=user.id,
        sender="system",
        message_type="expiry_reminder",
        content=_expiry_reminder_template(purchase.plan_name, expires_str),
        related_expires_at=purchase.expires_at,
        read_by_user=False,
        read_by_admin=True,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return {"created": True, "id": msg.id, "expires_at": purchase.expires_at.isoformat()}


def _purchase_confirmation_template(plan_name: str, amount_ks: int, next_billing_date: str) -> str:
    return (
        "System: Thank you for your purchase!\n"
        f"Plan You Choice: {plan_name}\n"
        f"Amount paid: {amount_ks:,} ks\n"
        f"Next billing date: {next_billing_date}\n"
        "System: Enjoy your storage 🚀"
    )


async def create_purchase_confirmation_message(
    user_id: int,
    plan_name: str,
    amount_ks: int,
    next_billing_date: datetime,
    session: AsyncSession,
):
    """
    Create a system message confirming a user's premium purchase.
    This is called right after a purchase is created.
    """
    # Format date as ISO (YYYY-MM-DD) for consistency
    next_date_str = next_billing_date.date().isoformat()
    msg = UserMessage(
        user_id=user_id,
        sender="system",
        message_type="purchase_confirmation",
        content=_purchase_confirmation_template(plan_name, amount_ks, next_date_str),
        read_by_user=False,
        read_by_admin=True,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return {"id": msg.id}


async def admin_list_messages(session: AsyncSession, user_id: int | None = None, limit: int = 500):
    q = select(UserMessage, UserTable).join(UserTable, UserMessage.user_id == UserTable.id)
    if user_id:
        q = q.where(UserMessage.user_id == user_id)
    q = q.order_by(desc(UserMessage.created_at)).limit(limit)
    res = await session.execute(q)
    rows = res.all()
    return {
        "messages": [
            {
                "id": m.id,
                "user_id": m.user_id,
                "username": u.username,
                "email": u.email,
                "sender": m.sender,
                "message_type": m.message_type,
                "content": m.content,
                "related_expires_at": m.related_expires_at.isoformat() if m.related_expires_at else None,
                "read_by_user": m.read_by_user,
                "read_by_admin": m.read_by_admin,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for (m, u) in rows
        ]
    }


async def admin_send_message(user_id: int, content: str, session: AsyncSession):
    content = (content or "").strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required")
    msg = UserMessage(
        user_id=user_id,
        sender="admin",
        message_type="general",
        content=content,
        read_by_user=False,
        read_by_admin=True,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return {"message": "Sent", "id": msg.id}


async def admin_mark_read(message_id: int, session: AsyncSession):
    q = select(UserMessage).where(UserMessage.id == message_id)
    res = await session.execute(q)
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    msg.read_by_admin = True
    await session.commit()
    return {"message": "OK"}

