from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import DatasetCreate, DatasetUpdate, DatasetOut
from app.services import crud

router = APIRouter(prefix="/api/datasets", tags=["数据集管理"])


@router.get("", response_model=list[DatasetOut])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    return await crud.get_datasets(db)


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_dataset(db, dataset_id)
    if not obj:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return obj


@router.post("", response_model=DatasetOut)
async def create_dataset(data: DatasetCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_dataset(db, data)


@router.put("/{dataset_id}", response_model=DatasetOut)
async def update_dataset(dataset_id: str, data: DatasetUpdate, db: AsyncSession = Depends(get_db)):
    obj = await crud.update_dataset(db, dataset_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return obj


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_dataset(db, dataset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return {"ok": True}
