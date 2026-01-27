from app.core.config import settings
from datetime import datetime, timedelta

from jose import jwt, JWTError

async def create_token(data: dict, token_type: str = "access") -> str:
    """
    Create a JWT token.

    - access: expires in `settings.access_token_expire_minutes` minutes
    - refresh: expires in `settings.refresh_token_expire_days` days
    """
    to_encode = data.copy()

    if token_type == "refresh":
        expire_time = datetime.now() + timedelta(days=settings.refresh_token_expire_days)
    else:
        # default to access token behaviour
        expire_time = datetime.now() + timedelta(minutes=settings.access_token_expire_minutes)
        token_type = "access"

    to_encode.update({"exp": expire_time, "type": token_type})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def decode_token(token: str) -> dict:
    """
    Decode a JWT token.

    On error, this function raises `JWTError` (including `ExpiredSignatureError`).
    """
    # Let jose raise JWTError / ExpiredSignatureError so callers can handle it.
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    return payload

