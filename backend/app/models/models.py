from sqlalchemy import Column, String, Text, Integer
from app.core.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    layout = Column(Text, nullable=False, default="[]")  # JSON
    components = Column(Text, nullable=False, default="[]")  # JSON
    theme = Column(String(20), nullable=False, default="dark")  # dark / light / blue / green / purple / red
    status = Column(String(20), nullable=False, default="draft")  # draft / published
    created_at = Column(String(30), nullable=False)
    updated_at = Column(String(30), nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sql_query = Column(Text, nullable=True)
    api_config = Column(Text, nullable=True)  # JSON
    data_schema = Column(Text, nullable=True)  # JSON
    created_at = Column(String(30), nullable=False)
    updated_at = Column(String(30), nullable=False)


class Datasource(Base):
    __tablename__ = "datasources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    db_type = Column(String(50), nullable=False)  # mysql / postgresql / sqlite
    host = Column(String(255), nullable=True)
    port = Column(Integer, nullable=True)
    database = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True)  # TODO: 加密存储
    created_at = Column(String(30), nullable=False)


class ApiSource(Base):
    __tablename__ = "api_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    base_url = Column(String(500), nullable=False)
    auth_type = Column(String(50), nullable=True)  # none / bearer / basic / api_key
    auth_config = Column(Text, nullable=True)  # JSON
    created_at = Column(String(30), nullable=False)
