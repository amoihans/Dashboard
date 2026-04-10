from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import (
    DashboardCreate, DashboardUpdate, DashboardOut,
)
from app.services import crud

router = APIRouter(prefix="/api/dashboards", tags=["大屏管理"])


@router.get("", response_model=list[DashboardOut])
async def list_dashboards(db: AsyncSession = Depends(get_db)):
    return await crud.get_dashboards(db)


@router.get("/{dashboard_id}", response_model=DashboardOut)
async def get_dashboard(dashboard_id: str, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_dashboard(db, dashboard_id)
    if not obj:
        raise HTTPException(status_code=404, detail="大屏不存在")
    return obj


@router.post("", response_model=DashboardOut)
async def create_dashboard(data: DashboardCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_dashboard(db, data)


@router.put("/{dashboard_id}", response_model=DashboardOut)
async def update_dashboard(dashboard_id: str, data: DashboardUpdate, db: AsyncSession = Depends(get_db)):
    obj = await crud.update_dashboard(db, dashboard_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="大屏不存在")
    return obj


@router.delete("/{dashboard_id}")
async def delete_dashboard(dashboard_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_dashboard(db, dashboard_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="大屏不存在")
    return {"ok": True}


@router.post("/{dashboard_id}/publish")
async def publish_dashboard(dashboard_id: str, db: AsyncSession = Depends(get_db)):
    obj = await crud.update_dashboard(db, dashboard_id, DashboardUpdate(status="published"))
    if not obj:
        raise HTTPException(status_code=404, detail="大屏不存在")
    return {"ok": True}


@router.post("/{dashboard_id}/unpublish")
async def unpublish_dashboard(dashboard_id: str, db: AsyncSession = Depends(get_db)):
    obj = await crud.update_dashboard(db, dashboard_id, DashboardUpdate(status="draft"))
    if not obj:
        raise HTTPException(status_code=404, detail="大屏不存在")
    return {"ok": True}
