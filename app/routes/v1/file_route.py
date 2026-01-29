from starlette import status
from starlette.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_utils import get_async_session
from app.services.file_service import (
    upload_file, 
    view_file_size, 
    download_file,
    list_files,
    delete_file,
    rename_file,
    get_directory_stats
)
from fastapi import File, UploadFile, APIRouter, Depends, Query, Response
from pydantic import BaseModel

router = APIRouter(prefix="/files", tags=["Files"])


class RenameRequest(BaseModel):
    new_filename: str


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    file: UploadFile = File(...)
):
    return await upload_file(request, session, file)


@router.get("/list", status_code=status.HTTP_200_OK)
async def list_files_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    response: Response = None,
):
    # User-specific: allow very short client caching to smooth rapid UI refreshes without staleness risk.
    if response is not None:
        response.headers["Cache-Control"] = "private, max-age=2"
    return await list_files(session, request, skip, limit)


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    response: Response = None,
):
    # Stats update frequently; still allow a tiny cache window to reduce repeated requests during navigation.
    if response is not None:
        response.headers["Cache-Control"] = "private, max-age=5"
    return await get_directory_stats(request, session)


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_file_info(
    id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    return await view_file_size(id, session, request)


@router.get("/{id}/download", status_code=status.HTTP_200_OK)
async def download_file_route(
    id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    return await download_file(id, session, request)


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_file_route(
    id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    return await delete_file(id, session, request)


@router.patch("/{id}/rename", status_code=status.HTTP_200_OK)
async def rename_file_route(
    id: int,
    rename_request: RenameRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    return await rename_file(id, rename_request.new_filename, session, request)