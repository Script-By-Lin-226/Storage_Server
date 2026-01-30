from jose import jwt, ExpiredSignatureError
from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from app.core.database_utils import async_session
from starlette.responses import JSONResponse
from sqlalchemy.future import select
from app.security.jwt import decode_token
from app.models.Database_Model import UserTable

_EXCLUDE_PATH = ["/auth/login" , "/auth/register" , "/openapi.json" , "/docs" , "/redoc" , "/"]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in _EXCLUDE_PATH:
            return await call_next(request)

        # If a previous middleware (e.g. TokenRotationMiddleware) has already
        # attached the authenticated user, trust it and continue.
        if getattr(request.state, "user", None):
            return await call_next(request)

        # Check for token in Authorization header first, then query params (for direct downloads), then cookies
        access_token = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            access_token = auth_header.split(" ")[1]
        elif request.url.path.endswith("/download") and "token" in request.query_params:
            # Allow token in query string for direct download links (one-time use)
            access_token = request.query_params.get("token")
        else:
            access_token = request.cookies.get("access_token")
        
        if access_token is None:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={'message':'Access Denied'})

        try:
            payload = await decode_token(access_token)
            user_id = int(payload.get("sub"))
            if user_id is None:
                return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={'message':'Invalid Token'})

            token_type = payload.get("type")
            if token_type != "access":
                return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={'message':'Token Type must be Access Token'})

        except jwt.ExpiredSignatureError:
            return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={'message':'Token Expired'})
        except Exception as ex:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={'message':f'{ex}'})

        async with async_session() as session:
            res = await session.execute(select(UserTable).where(UserTable.id == user_id))
            user = res.scalars().first()
            if user is None:
                return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={'message':'User not found'})

        request.state.user = user
        return await call_next(request)


