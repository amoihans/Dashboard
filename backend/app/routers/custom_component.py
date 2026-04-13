from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.schemas.schemas import (
    CustomComponentCreate,
    CustomComponentUpdate,
    CustomComponentOut,
    JsonSchemaValidateRequest,
)
from app.services import crud
from pydantic import BaseModel
import json
import os
import sqlite3

router = APIRouter(prefix="/api/custom-components", tags=["自定义组件"])


# SQL 预览请求
class SqlPreviewRequest(BaseModel):
    sql: str


@router.get("", response_model=list[CustomComponentOut])
async def list_custom_components(
    published: int = Query(None, description="筛选已发布状态 0: 草稿 1: 已发布"),
    category: str = Query(None, description="筛选分类"),
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_custom_components(db, published, category)


@router.get("/{component_id}", response_model=CustomComponentOut)
async def get_custom_component(component_id: str, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_custom_component(db, component_id)
    if not obj:
        raise HTTPException(status_code=404, detail="组件不存在")
    return obj


@router.post("", response_model=CustomComponentOut)
async def create_custom_component(data: CustomComponentCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_custom_component(db, data)


@router.put("/{component_id}", response_model=CustomComponentOut)
async def update_custom_component(
    component_id: str,
    data: CustomComponentUpdate,
    db: AsyncSession = Depends(get_db),
):
    obj = await crud.update_custom_component(db, component_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="组件不存在")
    return obj


@router.delete("/{component_id}")
async def delete_custom_component(component_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_custom_component(db, component_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="组件不存在")
    return {"ok": True}


@router.post("/validate")
async def validate_json_schema(data: JsonSchemaValidateRequest):
    """验证 JSON Schema 格式是否合法"""
    try:
        json.dumps(data.json_schema)
        return {"valid": True}
    except json.JSONDecodeError as e:
        return {"valid": False, "error": str(e)}


# 财经数据库路径
FINANCE_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "finance.db"
)


@router.post("/preview")
async def preview_sql(data: SqlPreviewRequest):
    """执行 SQL 预览查询，返回数据用于自定义组件预览"""
    sql = data.sql.strip()
    if not sql.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="仅支持 SELECT 查询")

    if not os.path.exists(FINANCE_DB_PATH):
        raise HTTPException(status_code=500, detail="财经数据库未初始化")

    try:
        conn = sqlite3.connect(FINANCE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        result = [[dict(row)[col] for col in columns] for row in rows]
        conn.close()
        return {"data": result, "columns": columns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))