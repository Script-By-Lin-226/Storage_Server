from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.database_utils import database_initialize
from app.middleware.auth_middleware import AuthMiddleware
from app.middleware.token_rotation_middleware import TokenRotationMiddleware
from app.routes.v1 import auth_route, file_route, admin_route, user_route, premium_route, message_route


@asynccontextmanager
async def life_cycle(app: FastAPI):
    await database_initialize()
    yield


app = FastAPI(description="Storage Server", version="22.1.2026", lifespan=life_cycle)

# When allow_credentials=True, we must NOT use ["*"] for allow_origins.
# Explicitly list frontend origins (Vite dev server, etc.).
allowed_origins = [
    "http://localhost:3000",
    "https://www.ktt-storage-server.site",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


# Order matters: AuthMiddleware is added first so TokenRotationMiddleware
# becomes the outermost middleware and can refresh tokens before auth runs.
app.add_middleware(AuthMiddleware)
app.add_middleware(TokenRotationMiddleware)

app.include_router(auth_route.router)
app.include_router(file_route.router)
app.include_router(user_route.router)
app.include_router(admin_route.router)
app.include_router(premium_route.router)
app.include_router(message_route.router)