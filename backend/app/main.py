from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.routers import dashboards, datasets, datasources, query, display


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="财经可视化大屏 API",
    description="拖拽式可视化大屏配置与展示平台",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboards.router)
app.include_router(datasets.router)
app.include_router(datasources.router)
app.include_router(datasources.apisource_router)
app.include_router(query.router)
app.include_router(display.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
