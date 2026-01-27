from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from starlette import status
from starlette.requests import Request
from starlette.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database_utils import get_async_session
from app.models.Database_Model import PremiumPurchase, UserQuotas
from app.services.file_service import UPLOAD_DIR

router = APIRouter(prefix="/premium", tags=["Premium"])


PREMIUM_PLANS = [
    {
        "id": "basic_free",
        "name": "Basic",
        "description": "Free plan for personal use.",
        "storage_gb": 10,
        "price_ks": 0,
        "max_upload_gb": 2,
        "speed": "limited",
        "features": ["Up to 10 GB storage", "Max file size 2 GB", "Limited upload speed"],
    },
    {
        "id": "premium_100",
        "name": "Premium 100GB",
        "description": "More space with normal speed and sharing features.",
        "storage_gb": 100,
        "price_ks": 7999,
        "max_upload_gb": 5,
        "speed": "normal",
        "features": [
            "100 GB secure storage",
            "Max file size 5 GB",
            "Normal upload speed",
            "Folder sharing access",
            "File sharing links",
        ],
    },
    {
        "id": "premium_plus_500",
        "name": "Premium Plus 500GB",
        "description": "High-speed storage for power users and teams.",
        "storage_gb": 500,
        "price_ks": 34999,
        "max_upload_gb": 20,
        "speed": "high",
        "features": [
            "500 GB secure storage",
            "Max file size 20 GB",
            "High upload speed",
            "Folder uploading",
            "Advanced download statistics",
        ],
    },
]


def _get_plan_by_id(plan_id: str) -> Optional[dict]:
    for p in PREMIUM_PLANS:
        if p["id"] == plan_id:
            return p
    return None


@router.get("/plans", status_code=status.HTTP_200_OK)
async def list_premium_plans() -> List[dict]:
    """Return available premium plans for the frontend pricing page."""
    return PREMIUM_PLANS


@router.post("/purchase", status_code=status.HTTP_201_CREATED)
async def create_premium_purchase(
    request: Request,
    plan_id: str = Form(...),
    phone_msisdn: str = Form(...),
    payment_method: str = Form(...),  # "KBZ_PAY" or "WAVE_PAY"
    transcript: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a premium plan purchase.

    The user provides:
    - plan_id
    - Myanmar phone number (must start with +95)
    - payment method (KBZ pay or Wave pay)
    - payment transcript upload
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    plan = _get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan")

    normalized_method = payment_method.upper()
    if normalized_method not in {"KBZ_PAY", "WAVE_PAY"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment method")

    if not phone_msisdn.startswith("+95"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone must start with +95")

    # Save transcript file under uploads/premium/{user_id}/
    user_dir = settings.upload_dir or UPLOAD_DIR
    premium_dir = f"{user_dir}/premium/{user.id}"
    # Lazy import to avoid circulars; but we stay with basic os operations here
    import os

    os.makedirs(premium_dir, exist_ok=True)
    safe_name = os.path.basename(transcript.filename) or "payment_proof"
    file_path = os.path.join(premium_dir, safe_name)

    with open(file_path, "wb") as f:
        content = await transcript.read()
        f.write(content)

    purchase = PremiumPurchase(
        user_id=user.id,
        plan_name=plan["name"],
        storage_gb=plan["storage_gb"],
        price_ks=plan["price_ks"],
        phone_msisdn=phone_msisdn,
        payment_method=normalized_method,
        transcript_path=file_path,
        # All new purchases start as pending; quota will be increased only after admin approval
        status="pending",
    )
    session.add(purchase)

    await session.commit()
    await session.refresh(purchase)

    return {
        "id": purchase.id,
        "plan_name": purchase.plan_name,
        "storage_gb": purchase.storage_gb,
        "price_ks": purchase.price_ks,
        "phone_msisdn": purchase.phone_msisdn,
        "payment_method": purchase.payment_method,
        "transcript_uploaded": bool(purchase.transcript_path),
        "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
    }


@router.get("/purchases", status_code=status.HTTP_200_OK)
async def list_my_purchases(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Return current user's premium purchases for dashboard display."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    stmt = select(PremiumPurchase).where(PremiumPurchase.user_id == user.id).order_by(PremiumPurchase.created_at.desc())
    res = await session.execute(stmt)
    purchases = res.scalars().all()

    now = datetime.now(timezone.utc)
    data = []
    for p in purchases:
        expires_at_iso = p.expires_at.isoformat() if getattr(p, "expires_at", None) else None
        is_active = p.status == "approved" and p.expires_at is not None and p.expires_at > now
        data.append(
            {
                "id": p.id,
                "plan_name": p.plan_name,
                "storage_gb": p.storage_gb,
                "price_ks": p.price_ks,
                "phone_msisdn": p.phone_msisdn,
                "payment_method": p.payment_method,
                "status": p.status,
                "expires_at": expires_at_iso,
                "is_active": is_active,
                "transcript_uploaded": bool(p.transcript_path),
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
        )

    return {"purchases": data}

