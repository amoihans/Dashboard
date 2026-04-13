from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.models import Dashboard, Dataset, Datasource, ApiSource, CustomComponent
from app.schemas.schemas import (
    DashboardCreate, DashboardUpdate,
    DatasetCreate, DatasetUpdate,
    DatasourceCreate,
    ApiSourceCreate, ApiSourceUpdate,
    CustomComponentCreate, CustomComponentUpdate,
)
from datetime import datetime
from typing import Optional


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ========== Dashboard CRUD ==========
async def create_dashboard(db: AsyncSession, data: DashboardCreate) -> Dashboard:
    now = now_str()
    obj = Dashboard(
        name=data.name,
        description=data.description,
        layout=data.layout,
        components=data.components,
        created_at=now,
        updated_at=now,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def get_dashboards(db: AsyncSession) -> list[Dashboard]:
    result = await db.execute(select(Dashboard).order_by(Dashboard.updated_at.desc()))
    return list(result.scalars().all())


async def get_dashboard(db: AsyncSession, dashboard_id: str) -> Optional[Dashboard]:
    result = await db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
    return result.scalar_one_or_none()


async def update_dashboard(db: AsyncSession, dashboard_id: str, data: DashboardUpdate) -> Optional[Dashboard]:
    obj = await get_dashboard(db, dashboard_id)
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    obj.updated_at = now_str()
    await db.flush()
    await db.refresh(obj)
    return obj


async def delete_dashboard(db: AsyncSession, dashboard_id: str) -> bool:
    result = await db.execute(delete(Dashboard).where(Dashboard.id == dashboard_id))
    return result.rowcount > 0


# ========== Dataset CRUD ==========
async def create_dataset(db: AsyncSession, data: DatasetCreate) -> Dataset:
    now = now_str()
    obj = Dataset(
        name=data.name,
        description=data.description,
        sql_query=data.sql_query,
        api_config=data.api_config,
        data_schema=data.data_schema,
        created_at=now,
        updated_at=now,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def get_datasets(db: AsyncSession) -> list[Dataset]:
    result = await db.execute(select(Dataset).order_by(Dataset.updated_at.desc()))
    return list(result.scalars().all())


async def get_dataset(db: AsyncSession, dataset_id: str) -> Optional[Dataset]:
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    return result.scalar_one_or_none()


async def update_dataset(db: AsyncSession, dataset_id: str, data: DatasetUpdate) -> Optional[Dataset]:
    obj = await get_dataset(db, dataset_id)
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    obj.updated_at = now_str()
    await db.flush()
    await db.refresh(obj)
    return obj


async def delete_dataset(db: AsyncSession, dataset_id: str) -> bool:
    result = await db.execute(delete(Dataset).where(Dataset.id == dataset_id))
    return result.rowcount > 0


# ========== Datasource CRUD ==========
async def create_datasource(db: AsyncSession, data: DatasourceCreate) -> Datasource:
    obj = Datasource(
        name=data.name,
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        database=data.database,
        username=data.username,
        password=data.password,
        created_at=now_str(),
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def get_datasources(db: AsyncSession) -> list[Datasource]:
    result = await db.execute(select(Datasource).order_by(Datasource.created_at.desc()))
    return list(result.scalars().all())


async def delete_datasource(db: AsyncSession, datasource_id: str) -> bool:
    result = await db.execute(delete(Datasource).where(Datasource.id == datasource_id))
    return result.rowcount > 0


# ========== ApiSource CRUD ==========
async def create_api_source(db: AsyncSession, data: ApiSourceCreate) -> ApiSource:
    obj = ApiSource(
        name=data.name,
        base_url=data.base_url,
        auth_type=data.auth_type,
        auth_config=data.auth_config,
        created_at=now_str(),
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def get_api_sources(db: AsyncSession) -> list[ApiSource]:
    result = await db.execute(select(ApiSource).order_by(ApiSource.created_at.desc()))
    return list(result.scalars().all())


async def update_api_source(db: AsyncSession, api_source_id: str, data: ApiSourceUpdate) -> Optional[ApiSource]:
    result = await db.execute(select(ApiSource).where(ApiSource.id == api_source_id))
    obj = result.scalar_one_or_none()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    await db.flush()
    await db.refresh(obj)
    return obj


async def delete_api_source(db: AsyncSession, api_source_id: str) -> bool:
    result = await db.execute(delete(ApiSource).where(ApiSource.id == api_source_id))
    return result.rowcount > 0


# ========== CustomComponent CRUD ==========
async def create_custom_component(db: AsyncSession, data: CustomComponentCreate) -> CustomComponent:
    now = now_str()
    obj = CustomComponent(
        name=data.name,
        description=data.description,
        category=data.category,
        json_schema=data.json_schema,
        data_source_config=data.data_source_config,
        is_published=data.is_published,
        created_at=now,
        updated_at=now,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def get_custom_components(db: AsyncSession, published: Optional[int] = None, category: Optional[str] = None) -> list[CustomComponent]:
    query = select(CustomComponent)
    if published is not None:
        query = query.where(CustomComponent.is_published == published)
    if category is not None:
        query = query.where(CustomComponent.category == category)
    result = await db.execute(query.order_by(CustomComponent.updated_at.desc()))
    return list(result.scalars().all())


async def get_custom_component(db: AsyncSession, component_id: str) -> Optional[CustomComponent]:
    result = await db.execute(select(CustomComponent).where(CustomComponent.id == component_id))
    return result.scalar_one_or_none()


async def update_custom_component(db: AsyncSession, component_id: str, data: CustomComponentUpdate) -> Optional[CustomComponent]:
    obj = await get_custom_component(db, component_id)
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    obj.updated_at = now_str()
    await db.flush()
    await db.refresh(obj)
    return obj


async def delete_custom_component(db: AsyncSession, component_id: str) -> bool:
    result = await db.execute(delete(CustomComponent).where(CustomComponent.id == component_id))
    return result.rowcount > 0
