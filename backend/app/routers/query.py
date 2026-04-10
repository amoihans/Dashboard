from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db, engine
from app.schemas.schemas import SqlQueryRequest, ApiQueryRequest
from app.services import crud
from app.models.models import ApiSource
import httpx
import json
import re

router = APIRouter(prefix="/api/query", tags=["数据查询"])


# SQL 防注入检查
SQL_BLOCKED_KEYWORDS = [
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE)\b",
]


def validate_sql(sql: str) -> bool:
    sql_upper = sql.upper().strip()
    if not sql_upper.startswith("SELECT"):
        return False
    for pattern in SQL_BLOCKED_KEYWORDS:
        if re.search(pattern, sql_upper):
            return False
    return True


@router.post("/sql")
async def query_sql(req: SqlQueryRequest, db: AsyncSession = Depends(get_db)):
    if not validate_sql(req.sql):
        raise HTTPException(status_code=400, detail="仅支持 SELECT 查询")

    try:
        result = await db.execute(text(req.sql))
        rows = result.fetchall()
        columns = result.keys()
        data = [dict(zip(columns, row)) for row in rows]
        return {"data": data, "total": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dataset/{dataset_id}")
async def query_dataset(dataset_id: str, db: AsyncSession = Depends(get_db)):
    dataset = await crud.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")

    if dataset.sql_query:
        if not validate_sql(dataset.sql_query):
            raise HTTPException(status_code=400, detail="数据集 SQL 不合法")
        try:
            result = await db.execute(text(dataset.sql_query))
            rows = result.fetchall()
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in rows]
            return {"data": data, "total": len(data)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    if dataset.api_config:
        try:
            cfg = json.loads(dataset.api_config)
            async with httpx.AsyncClient() as client:
                resp = await client.request(
                    cfg.get("method", "GET"),
                    cfg["url"],
                    params=cfg.get("params"),
                    json=cfg.get("body"),
                    timeout=10.0,
                )
                resp.raise_for_status()
                data = resp.json()
                return {"data": data, "total": len(data) if isinstance(data, list) else 1}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"API请求失败: {str(e)}")

    raise HTTPException(status_code=400, detail="数据集未配置查询")


@router.post("/api")
async def query_api(req: ApiQueryRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM api_sources WHERE id = :id"),
        {"id": req.api_source_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="API数据源不存在")

    keys = result.keys()
    api_source = dict(zip(keys, row))

    headers = {}
    auth_config = api_source.get("auth_config")
    if auth_config:
        ac = json.loads(auth_config)
        if api_source["auth_type"] == "bearer":
            headers["Authorization"] = f"Bearer {ac.get('token')}"
        elif api_source["auth_type"] == "basic":
            import base64
            creds = f"{ac.get('username')}:{ac.get('password')}"
            headers["Authorization"] = f"Basic {base64.b64encode(creds.encode()).decode()}"
        elif api_source["auth_type"] == "api_key":
            headers[ac.get("header_name", "X-API-Key")] = ac.get("api_key")

    url = f"{api_source['base_url'].rstrip('/')}/{req.path.lstrip('/')}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                req.method,
                url,
                params=req.params,
                json=req.body,
                headers=headers,
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
