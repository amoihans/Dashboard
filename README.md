# 财经可视化大屏平台

拖拽式可视化大屏配置与展示平台，面向业务人员/数据分析师，零代码配置大屏。

## 项目简介

支持三种数据源：
- **SQL 查询** - 直连数据库执行 SELECT 查询
- **数据集** - 预定义的数据查询模板
- **API** - 第三方 HTTP API 数据源

核心功能：拖拽布局大屏 → 预览确认 → 全屏展示

## 技术栈

| 类别 | 选型 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 图表库 | ECharts 5 |
| 拖拽布局 | react-grid-layout |
| UI 组件库 | Ant Design 6 + 百度 amis |
| 状态管理 | Zustand |
| 后端框架 | FastAPI |
| 数据库 | SQLite + SQLAlchemy 2 + Alembic |

## 项目结构

```
dashboard/
├── frontend/                 # React 前端项目
│   ├── src/
│   │   ├── components/       # 图表组件
│   │   ├── pages/            # 页面
│   │   ├── stores/           # Zustand 状态管理
│   │   ├── services/         # API 请求
│   │   └── types/            # TypeScript 类型
│   └── package.json
│
├── backend/                  # FastAPI 后端项目
│   ├── app/
│   │   ├── routers/          # API 路由
│   │   ├── models/           # SQLAlchemy 模型
│   │   ├── schemas/          # Pydantic 模型
│   │   ├── services/         # 业务逻辑
│   │   ├── core/             # 核心配置
│   │   └── agent/            # AI Agent 相关
│   ├── alembic/              # 数据库迁移
│   └── requirements.txt
│
├── amis_docs/                # amis 组件文档
└── docs/                     # 设计文档
```

## 环境要求

- **Python**: 3.10+
- **Node.js**: 18+
- **npm** / **pnpm** / **yarn**

## 启动方法

### 1. 后端启动

```bash
cd backend

# 安装依赖（使用虚拟环境推荐）
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端启动后访问：
- API 文档: http://localhost:8000/api/docs
- 健康检查: http://localhost:8000/api/health

### 2. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端启动后访问：http://localhost:5173

## 主要页面

| 路径 | 说明 |
|------|------|
| `/` | 首页/大屏列表 |
| `/dashboard/new` | 新建大屏 |
| `/dashboard/:id/edit` | 编辑大屏（拖拽编辑） |
| `/dashboard/:id/preview` | 预览大屏 |
| `/display/:id` | 全屏展示 |
| `/datasets` | 数据集管理 |
| `/datasources` | 数据源管理 |

## API 文档

详见 [DESIGN.md](DESIGN.md)，或启动后端后访问 http://localhost:8000/api/docs 查看 Swagger UI 文档。

## 开发说明

### 数据库迁移

```bash
cd backend
alembic upgrade head
```

### 前端构建

```bash
cd frontend
npm run build
```

构建产物输出到 `frontend/dist/`