# 财经可视化大屏 - 设计文档 v1.0

## 1. 项目概述

- **项目名称**：财经可视化大屏平台
- **项目定位**：拖拽式可视化大屏配置与展示平台，面向业务人员/数据分析师
- **核心价值**：零代码配置大屏，支持 SQL查询、数据集、API 三种数据源
- **核心功能**：拖拽布局大屏 → 预览确认 → 全屏展示
- **一期范围**：单个主屏、拖拽编辑、预览发布，暂不涉及 Agent 智能布局和权限管理

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 大屏编辑页 │  │ 大屏预览页 │  │ 大屏展示页 │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                   │
│       └──────────────┼──────────────┘                   │
│                      │                                  │
│              ┌───────▼───────┐                         │
│              │   API 请求    │                         │
│              └───────┬───────┘                         │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                    后端 (FastAPI)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │大屏管理API│  │数据源API  │  │数据查询API │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                   │
│       └──────────────┼──────────────┘                   │
│                      │                                  │
│              ┌───────▼───────┐                         │
│              │    SQLite     │                         │
│              └───────────────┘                         │
└─────────────────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      ┌────────┐  ┌─────────┐  ┌────────┐
      │内部数据库│  │ 数据集  │  │第三方API│
      └────────┘  └─────────┘  └────────┘
```

---

## 3. 技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化生态成熟 |
| 图表库 | ECharts 5 | 主流，财经图表支持完善 |
| 拖拽布局 | react-grid-layout | 支持 24 栅格，成熟稳定 |
| UI 组件库 | Ant Design 5 | 企业级组件，编辑页使用 |
| 状态管理 | Zustand | 轻量，配合 react-grid-layout |
| 后端框架 | FastAPI | 高性能，自动 OpenAPI 文档 |
| 数据库 | SQLite | 一期快速起步，后续可迁移 |
| ORM | SQLAlchemy 2 + Alembic | 主流 Python ORM |
| 数据查询 | 原生 SQL 执行 + HTTP 客户端 | 数据源统一抽象 |
| 实时刷新 | 前端轮询（一期） | 简单可靠，后续可升级 WebSocket |

---

## 4. 数据库表结构设计

```sql
-- 大屏表
CREATE TABLE dashboards (
    id          TEXT PRIMARY KEY,       -- UUID
    name        TEXT NOT NULL,          -- 大屏名称
    description TEXT,                    -- 描述
    layout      TEXT NOT NULL,          -- JSON: react-grid-layout 布局数据
    components  TEXT NOT NULL,          -- JSON: 组件配置列表
    status      TEXT NOT NULL DEFAULT 'draft',  -- draft / published
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- 数据集表（预定义的查询结果）
CREATE TABLE datasets (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    sql_query   TEXT,                   -- 原始 SQL
    api_config  TEXT,                   -- JSON: API 配置
    data_schema TEXT,                   -- JSON: 返回字段 schema
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- 数据源表（数据库连接配置）
CREATE TABLE datasources (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    db_type     TEXT NOT NULL,          -- mysql / postgresql / sqlite
    host        TEXT,
    port        INTEGER,
    database    TEXT,
    username    TEXT,
    password    TEXT,                   -- 建议后续加密存储
    created_at  TEXT NOT NULL
);

-- API 数据源表
CREATE TABLE api_sources (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    base_url    TEXT NOT NULL,
    auth_type   TEXT,                   -- none / bearer / basic / api_key
    auth_config TEXT,                   -- JSON: 认证配置
    created_at  TEXT NOT NULL
);
```

**说明**：
- 组件配置 `components` 字段存储组件类型、绑定数据集/数据集/API、图表具体配置（ECharts option）
- 密码字段一期明文存储，一期后再考虑加密

---

## 5. 核心 API 设计

### 5.1 大屏管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboards` | 获取大屏列表 |
| GET | `/api/dashboards/:id` | 获取大屏详情（含布局+组件） |
| POST | `/api/dashboards` | 创建大屏 |
| PUT | `/api/dashboards/:id` | 更新大屏（布局/组件/状态） |
| DELETE | `/api/dashboards/:id` | 删除大屏 |
| POST | `/api/dashboards/:id/publish` | 发布大屏 |
| POST | `/api/dashboards/:id/unpublish` | 下线大屏 |

### 5.2 数据集管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/datasets` | 获取数据集列表 |
| GET | `/api/datasets/:id` | 获取数据集详情 |
| POST | `/api/datasets` | 创建数据集（SQL 或 API 配置） |
| PUT | `/api/datasets/:id` | 更新数据集 |
| DELETE | `/api/datasets/:id` | 删除数据集 |
| POST | `/api/datasets/:id/preview` | 预览数据集查询结果（限制条数） |

### 5.3 数据源管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/datasources` | 获取数据库连接列表 |
| POST | `/api/datasources` | 添加数据库连接 |
| DELETE | `/api/datasources/:id` | 删除连接 |
| POST | `/api/datasources/:id/test` | 测试连接 |
| GET | `/api/apisources` | 获取 API 数据源列表 |
| POST | `/api/apisources` | 添加 API 数据源 |
| DELETE | `/api/apisources/:id` | 删除 API 数据源 |

### 5.4 数据查询

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/query/sql` | 执行 SQL（仅 SELECT，防注入） |
| POST | `/api/query/api` | 转发 API 请求 |
| GET | `/api/query/dataset/:id` | 查询数据集最新数据 |

### 5.5 大屏展示

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/display/:id` | 获取已发布大屏的完整数据（布局+组件+数据） |
| GET | `/api/display/:id/refresh` | 刷新大屏数据（返回各组件最新数据） |

---

## 6. 组件设计

### 6.1 组件类型（一期）

| 组件名 | ECharts 类型 | 说明 |
|--------|-------------|------|
| 折线图 | line | 时序数据 |
| 柱状图 | bar | 分类对比 |
| 饼图 | pie | 占比展示 |
| 仪表盘 | gauge | 指标监控 |
| K线图 | candlestick | 股票/期货 |
| 数字卡片 | custom | 展示单个 KPI |
| 表格 | custom | 展示明细数据 |

### 6.2 组件配置结构

```typescript
interface ComponentConfig {
  id: string;              // 组件唯一ID
  type: ComponentType;     // 组件类型
  title: string;           // 组件标题
  layout: {                // react-grid-layout 布局
    x: number;
    y: number;
    w: number;
    h: number;
  };
  dataSource: {
    sourceType: 'dataset' | 'sql' | 'api';
    datasetId?: string;
    sql?: string;
    apiConfig?: object;
  };
  chartConfig: object;     // ECharts option（部分覆盖）
  refreshInterval?: number; // 刷新间隔（秒），0 则不刷新
}
```

### 6.3 数据映射

组件的数据字段通过 ECharts 的 `dataset` 机制或直接映射，支持：
- 直接数据集 ID 引用
- 实时 SQL 查询结果
- 第三方 API 返回

---

## 7. 前端页面设计

### 7.1 页面列表

```
/                   -- 首页/大屏列表
/dashboard/new      -- 新建大屏（跳转编辑页）
/dashboard/:id/edit -- 编辑大屏（拖拽编辑）
/dashboard/:id/preview -- 预览大屏（真实数据）
/display/:id        -- 全屏展示
/datasets           -- 数据集管理
/datasources        -- 数据源管理
```

### 7.2 大屏编辑页核心交互

1. 左侧：组件列表（可拖拽到画布）
2. 中间：画布（react-grid-layout 网格，可自由布局）
3. 右侧：选中组件属性面板（数据源绑定、图表配置）
4. 顶部：保存 / 预览 / 发布 按钮

### 7.3 大屏展示页

- 全屏模式（F11 或手动进入）
- 定时刷新（各组件独立刷新间隔）
- 响应式适配（TV 分辨率 1920x1080 为主）

---

## 8. 数据流详解

```
编辑阶段:
  用户拖拽组件 → 配置数据源 → 保存 → 写入 dashboards 表

预览阶段:
  前端请求 /api/display/:id/refresh → 后端执行各组件 SQL/API → 返回数据 → 前端渲染

展示阶段:
  前端轮询 /api/display/:id/refresh → 定时更新图表数据
```

**SQL 执行安全**：后端仅允许 SELECT 语句，带白名单校验，禁止 DDL/DML。

---

## 9. 目录结构建议

```
dashboard/
├── frontend/                 # React 项目
│   ├── src/
│   │   ├── components/       # 图表组件
│   │   ├── pages/            # 页面
│   │   ├── stores/           # Zustand store
│   │   ├── services/         # API 请求
│   │   └── types/            # TS 类型
│   └── package.json
│
├── backend/                  # FastAPI 项目
│   ├── app/
│   │   ├── routers/          # API 路由
│   │   ├── models/           # SQLAlchemy 模型
│   │   ├── schemas/          # Pydantic 模型
│   │   ├── services/         # 业务逻辑
│   │   └── core/             # 配置/工具
│   ├── alembic/              # 数据库迁移
│   └── requirements.txt
│
└── docs/                    # 设计文档
```

---

## 10. 开发里程碑建议

### 一期（MVP）- 拖拽基础版
1. 项目脚手架搭建（前端 + 后端）
2. 数据库表创建 + ORM 集成
3. 大屏 CRUD + 发布/下线
4. react-grid-layout 拖拽编辑页
5. ECharts 基础图表组件（7种）
6. 数据集管理 + SQL 预览
7. 大屏预览页 + 展示页
8. 前后端联调

### 二期 - 数据源扩展
1. 多数据库连接支持
2. API 数据源支持
3. 数据集刷新与缓存

### 三期 - Agent 智能布局
1. 自然语言描述 → 生成大屏布局
2. 组件自动推荐

---

## 11. 潜在风险与待确认

| 风险项 | 说明 |
|--------|------|
| SQL 注入 | 一期做 SELECT 白名单 + 权限校验 |
| 大屏性能 | 多图表同时请求，一期轮询并发控制 |
| 数据量大 | K线图/表格大数据量，前端分页/虚拟滚动 |
| 第三方 API 稳定性 | 需考虑超时、错误处理、缓存 |

---

## 12. 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-04-10 | 初始版本，涵盖一期功能范围 |
