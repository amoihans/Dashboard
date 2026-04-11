from fastapi import APIRouter, HTTPException
from app.services import crud
from app.core.database import async_session_maker
import json

router = APIRouter(prefix="/api/display", tags=["大屏展示"])


@router.get("/{dashboard_id}")
async def get_display_dashboard(dashboard_id: str):
    async with async_session_maker() as db:
        obj = await crud.get_dashboard(db, dashboard_id)
        if not obj:
            raise HTTPException(status_code=404, detail="大屏不存在")
        if obj.status != "published":
            raise HTTPException(status_code=400, detail="大屏未发布")
        return {
            "id": obj.id,
            "name": obj.name,
            "description": obj.description,
            "layout": json.loads(obj.layout or "[]"),
            "components": json.loads(obj.components or "[]"),
            "theme": obj.theme,
        }


@router.get("/{dashboard_id}/refresh")
async def refresh_display(dashboard_id: str):
    """刷新大屏所有组件数据"""
    async with async_session_maker() as db:
        obj = await crud.get_dashboard(db, dashboard_id)
        if not obj:
            raise HTTPException(status_code=404, detail="大屏不存在")
        if obj.status != "published":
            raise HTTPException(status_code=400, detail="大屏未发布")

        components = json.loads(obj.components or "[]")
        refreshed = []

        for comp in components:
            comp_id = comp.get("id")
            data_source = comp.get("dataSource", {})
            source_type = data_source.get("sourceType")

            if source_type == "dataset" and data_source.get("datasetId"):
                from app.routers.query import query_dataset
                try:
                    result = await query_dataset(data_source["datasetId"], db)
                    refreshed.append({"id": comp_id, "data": result.get("data", [])})
                except Exception:
                    refreshed.append({"id": comp_id, "data": [], "error": "查询失败"})

            elif source_type == "sql" and data_source.get("sql"):
                from app.routers.query import query_sql
                from app.schemas.schemas import SqlQueryRequest
                try:
                    result = await query_sql(SqlQueryRequest(sql=data_source["sql"]), db)
                    refreshed.append({"id": comp_id, "data": result.get("data", [])})
                except Exception:
                    refreshed.append({"id": comp_id, "data": [], "error": "查询失败"})

            else:
                refreshed.append({"id": comp_id, "data": []})

        return {"components": refreshed}
