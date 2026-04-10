from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import DatasourceCreate, DatasourceOut, ApiSourceCreate, ApiSourceOut
from app.services import crud

router = APIRouter(prefix="/api/datasources", tags=["数据源管理"])


@router.get("", response_model=list[DatasourceOut])
async def list_datasources(db: AsyncSession = Depends(get_db)):
    return await crud.get_datasources(db)


@router.post("", response_model=DatasourceOut)
async def create_datasource(data: DatasourceCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_datasource(db, data)


@router.delete("/{datasource_id}")
async def delete_datasource(datasource_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_datasource(db, datasource_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return {"ok": True}


apisource_router = APIRouter(prefix="/api/apisources", tags=["API数据源管理"])


@apisource_router.get("", response_model=list[ApiSourceOut])
async def list_api_sources(db: AsyncSession = Depends(get_db)):
    return await crud.get_api_sources(db)


@apisource_router.post("", response_model=ApiSourceOut)
async def create_api_source(data: ApiSourceCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_api_source(db, data)


@apisource_router.delete("/{api_source_id}")
async def delete_api_source(api_source_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_api_source(db, api_source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="API数据源不存在")
    return {"ok": True}
