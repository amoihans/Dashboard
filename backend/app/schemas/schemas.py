from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ========== Dashboard ==========
class DashboardBase(BaseModel):
    name: str
    description: Optional[str] = None


class DashboardCreate(DashboardBase):
    layout: str = "[]"
    components: str = "[]"


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[str] = None
    components: Optional[str] = None
    status: Optional[str] = None


class DashboardOut(DashboardBase):
    id: str
    layout: str
    components: str
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ========== Dataset ==========
class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None


class DatasetCreate(DatasetBase):
    sql_query: Optional[str] = None
    api_config: Optional[str] = None
    data_schema: Optional[str] = None


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sql_query: Optional[str] = None
    api_config: Optional[str] = None
    data_schema: Optional[str] = None


class DatasetOut(DatasetBase):
    id: str
    sql_query: Optional[str]
    api_config: Optional[str]
    data_schema: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ========== Datasource ==========
class DatasourceBase(BaseModel):
    name: str
    db_type: str


class DatasourceCreate(DatasourceBase):
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class DatasourceOut(DatasourceBase):
    id: str
    host: Optional[str]
    port: Optional[int]
    database: Optional[str]
    username: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ========== ApiSource ==========
class ApiSourceBase(BaseModel):
    name: str
    base_url: str


class ApiSourceCreate(ApiSourceBase):
    auth_type: Optional[str] = None
    auth_config: Optional[str] = None


class ApiSourceUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[str] = None


class ApiSourceOut(ApiSourceBase):
    id: str
    auth_type: Optional[str]
    auth_config: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ========== Query ==========
class SqlQueryRequest(BaseModel):
    sql: str
    datasource_id: Optional[str] = None  # 如果不指定则用主数据库


class ApiQueryRequest(BaseModel):
    api_source_id: str
    path: str = ""
    method: str = "GET"
    params: Optional[dict] = None
    body: Optional[dict] = None
