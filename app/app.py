from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.database_utils import database_initialize
from contextlib import asynccontextmanager
from app.routes.v1 import auth_route, file_route, admin_route, user_route
from app.middleware.auth_middleware import AuthMiddleware

@asynccontextmanager
async def life_cycle(app: FastAPI):
    await database_initialize()
    yield
app = FastAPI(description="Storage Server", version="22.1.2026", lifespan=life_cycle)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def read_root():
    return {"Hello": "World"}

app.add_middleware(AuthMiddleware)
app.include_router(auth_route.router)
app.include_router(file_route.router)
app.include_router(user_route.router)
app.include_router(admin_route.router)


