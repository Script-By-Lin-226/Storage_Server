from fastapi import HTTPException

from app.core.config import settings
from datetime import datetime, timedelta

from jose import jwt, JWTError

async def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire_time = datetime.now() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire_time, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return {"message": "Invalid token"}
    except Exception as err:
        return {"message": str(err)}

