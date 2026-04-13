# 自定义组件系统设计文档

## 1. 需求概述

用户可以通过 Agent 对话方式构建自定义组件，这些组件使用 [json-render](https://github.com/vercel-labs/json-render) 技术渲染，并可配置动态数据源。

### 核心功能
1. **自定义组件构建页** - 通过 Agent 对话构建符合 json-render 格式的组件 JSON
2. **组件库管理** - 保存、编辑、删除自定义组件
3. **组件渲染** - 在大屏中使用 json-render 渲染自定义组件
4. **动态数据源** - 支持为自定义组件配置 SQL/finance-sql 数据源

---

## 2. json-render 简介

json-render 是 Vercel Labs 的开源项目，允许通过 JSON Schema 动态渲染 React 组件。

### JSON Schema 示例
```json
{
  "component": "div",
  "props": {
    "className": "custom-card",
    "style": {
      "padding": "20px",
      "background": "#fff",
      "borderRadius": "8px"
    }
  },
  "children": [
    {
      "component": "h2",
      "props": {
        "style": { "color": "#333", "marginBottom": "12px" }
      },
      "children": "${title}"
    },
    {
      "component": "div",
      "props": {
        "className": "value",
        "style": { "fontSize": "32px", "fontWeight": "bold", "color": "#007bff" }
      },
      "children": "${value}"
    },
    {
      "component": "button",
      "props": {
        "onClick": { "type": "action", "handler": "handleClick" },
        "style": { "marginTop": "10px", "padding": "8px 16px" }
      },
      "children": "点击"
    }
  ]
}
```

### 支持的 JSON Schema 特性
- **component**: 组件名称（div, span, h1, button, 自定义组件等）
- **props**: 组件属性（style, className, onClick 等）
- **children**: 子元素（字符串、数组、或引用变量 `${variable}`）
- **循环渲染**: 使用 `{#each}` 语法渲染列表
- **条件渲染**: 使用 `{#if}` 语法条件显示
- **action handler**: 绑定事件处理函数

---

## 3. 系统架构

### 3.1 目录结构

```
frontend/src/
├── components/
│   ├── charts/
│   │   └── JsonRenderChart.tsx      # 新增：json-render 渲染器
│   └── custom/
│       ├── CustomComponentBuilder.tsx  # 新增：组件构建器页面
│       ├── CustomComponentLibrary.tsx  # 新增：组件库管理
│       └── CustomComponentPalette.tsx  # 新增：自定义组件面板
├── stores/
│   └── customComponentStore.ts      # 新增：自定义组件状态管理
pages/
├── CustomComponentBuilder.tsx       # 新增：构建器路由页面

backend/app/
├── routers/
│   └── custom_component.py          # 新增：自定义组件 API
├── models/
│   └── custom_component.py           # 新增：自定义组件模型
└── schemas/
    └── custom_component.py           # 新增：自定义组件 Schema
```

### 3.2 数据模型

#### CustomComponent (数据库模型)
```python
class CustomComponent(Base):
    __tablename__ = "custom_components"

    id: str                    # UUID
    name: str                  # 组件名称
    description: str           # 组件描述
    category: str              # 分类（如：卡片、图表、信息展示）
    json_schema: dict           # json-render JSON Schema
    data_source_config: dict   # 数据源配置
    thumbnail: str             # 缩略图 URL（可选）
    created_at: datetime
    updated_at: datetime
    is_published: bool         # 是否发布到组件库
```

#### CustomComponentConfig (前端类型)
```typescript
interface CustomComponentConfig extends ComponentConfig {
  type: 'custom';
  customComponentId: string;   // 关联的自定义组件 ID
  overrides?: {                // 可选的属性覆盖
    props?: Record<string, unknown>;
    styles?: Record<string, string>;
  };
}
```

---

## 4. 功能模块

### 4.1 Agent 构建器页面 (`/custom-component/builder`)

#### 页面布局
```
┌─────────────────────────────────────────────────────────┐
│  顶部工具栏：返回 | 组件名称(可编辑) | 保存到组件库      │
├───────────────────────────────┬─────────────────────────┤
│                               │                         │
│      Agent 对话区域            │    实时预览区域          │
│      (50% 宽度)               │    (50% 宽度)           │
│                               │                         │
│  • 用户描述需求                │    组件渲染预览          │
│  • Agent 生成 JSON Schema     │    模拟数据展示          │
│  • 用户确认/调整              │                         │
│                               │                         │
├───────────────────────────────┴─────────────────────────┤
│  JSON Schema 编辑器 (可折叠)                            │
│  • 手动编辑生成的 JSON                                  │
│  • 语法高亮 + 格式化                                    │
└─────────────────────────────────────────────────────────┘
```

#### Agent 对话流程

1. **用户**: "创建一个卡片组件，显示标题、數值和趨勢箭頭"
2. **Agent**:
   - 调用 LLM 生成 json-render JSON Schema
   - 展示生成的 JSON
   - 询问用户是否需要调整
3. **用户**: "把背景改成蓝色"
4. **Agent**: 更新 JSON Schema
5. **用户**: "保存到组件库"
6. **Agent**: 调用 API 保存组件

#### Agent Prompt 模板
```
你是一个专业的 json-render 组件构建助手。用户会描述他们想要的 UI 组件，
你需要生成符合 json-render 规范的 JSON Schema。

json-render 规范：
- component: 组件类型（如 div, span, h1-h6, button, img, 自定义组件）
- props: 属性对象，支持 style, className, onClick 等
- children: 子元素，可以是字符串、数组、或 ${变量名} 引用
- {#each} 循环: {"#each": "${items}", "component": "div", "children": "${item.name}"}
- {#if} 条件: {"#if": "${show}", "component": "span", "children": "显示"}

当前模拟数据：
{simulated_data}

请生成组件的 JSON Schema。
```

### 4.2 组件库页面 (`/custom-component/library`)

#### 功能
- 列表展示所有自定义组件（卡片形式）
- 搜索、筛选组件
- 编辑、删除、复制组件
- 一键发布/下架
- 预览组件效果

### 4.3 自定义组件面板

在 `ComponentPalette` 中新增 `custom` 分类：

```typescript
// ComponentPalette.tsx 扩展
{ category: 'custom', label: '自定义组件', icon: <Wand size={20} /> }
```

点击后弹出自定义组件选择器（列表/网格视图）。

### 4.4 大屏集成

#### ChartRenderer 扩展
```typescript
// ChartRenderer.tsx
case 'custom':
  return <JsonRenderChart
    customComponentId={config.customComponentId}
    data={data}
    overrides={config.overrides}
  />;
```

#### JsonRenderChart 组件
```typescript
interface JsonRenderChartProps {
  customComponentId: string;
  data: Record<string, unknown>[];
  overrides?: {
    props?: Record<string, unknown>;
    styles?: Record<string, string>;
  };
}
```

实现思路：
1. 从 `customComponentStore` 获取组件的 JSON Schema
2. 将 `data` 注入到 Schema 的 `data` 变量
3. 使用 json-render 库的 `<JsonRender />` 组件渲染

---

## 5. API 设计

### 5.1 后端 API

#### 获取组件列表
```
GET /api/custom-components
Query: ?published=true&category=&search=
Response: { components: CustomComponent[] }
```

#### 获取单个组件
```
GET /api/custom-components/:id
Response: CustomComponent
```

#### 创建组件
```
POST /api/custom-components
Body: { name, description, category, json_schema, data_source_config, is_published }
Response: CustomComponent
```

#### 更新组件
```
PUT /api/custom-components/:id
Body: { name?, description?, category?, json_schema?, data_source_config?, is_published? }
Response: CustomComponent
```

#### 删除组件
```
DELETE /api/custom-components/:id
Response: { success: true }
```

#### 验证 JSON Schema
```
POST /api/custom-components/validate
Body: { json_schema: object }
Response: { valid: boolean, error?: string }
```

### 5.2 前端 Store

```typescript
// customComponentStore.ts
interface CustomComponentStore {
  components: CustomComponent[];
  currentComponent: CustomComponent | null;
  loading: boolean;

  fetchComponents(): Promise<void>;
  getComponent(id: string): Promise<CustomComponent>;
  createComponent(data: CreateDTO): Promise<CustomComponent>;
  updateComponent(id: string, data: UpdateDTO): Promise<CustomComponent>;
  deleteComponent(id: string): Promise<void>;
}
```

---

## 6. 数据源集成

### 6.1 自定义组件数据源配置

```typescript
interface CustomComponentDataSource {
  sourceType: 'inline' | 'finance-sql' | 'sql' | 'dataset' | 'api';
  // inline: 直接在 JSON Schema 中嵌入静态数据
  // 其他类型: 运行时从 API 获取

  // SQL 类型配置
  sql?: string;

  // 数据路径（如果数据是嵌套结构）
  dataPath?: string;  // e.g., "data.items"

  // 数据映射（将 API 返回映射到 Schema 变量）
  fieldMapping?: Record<string, string>;
}
```

### 6.2 数据注入机制

```typescript
// JsonRenderChart.tsx
function JsonRenderChart({ customComponentId, data, overrides }) {
  const { data: runtimeData, loading } = useCustomComponentData(customComponentId);

  // 合并数据源
  const mergedData = runtimeData || data;

  // 将数据注入到 Schema
  const resolvedSchema = resolveSchemaVariables(schema, mergedData);

  return <JsonRender schema={resolvedSchema} overrides={overrides} />;
}
```

---

## 7. Agent 集成

### 7.1 Agent 扩展

现有 `DashboardAgent` 扩展新操作：

```python
# agent.py 新增操作
ADD_CUSTOM_COMPONENT = "ADD_CUSTOM_COMPONENT"
UPDATE_CUSTOM_COMPONENT = "UPDATE_CUSTOM_COMPONENT"
```

### 7.2 Agent 与组件构建器交互

构建器页面的 Agent 可以：
1. 生成 json-render JSON Schema
2. 解释现有 Schema
3. 根据用户反馈调整 Schema
4. 调用保存 API

---

## 8. 实现计划

### Phase 1: 基础设施
- [ ] 创建数据库模型 `CustomComponent`
- [ ] 创建后端 API 路由
- [ ] 创建前端 `customComponentStore`
- [ ] 创建 `JsonRenderChart` 渲染组件

### Phase 2: 组件构建器
- [ ] 创建 `CustomComponentBuilder` 页面
- [ ] 集成 Agent 对话（复用现有 Agent 组件）
- [ ] JSON Schema 编辑器（代码编辑器）
- [ ] 实时预览功能

### Phase 3: 组件库
- [ ] 创建 `CustomComponentLibrary` 页面
- [ ] 组件列表、搜索、筛选
- [ ] 编辑、删除、发布功能

### Phase 4: 大屏集成
- [ ] 扩展 `ComponentPalette` 支持自定义组件
- [ ] 扩展 `ChartRenderer` 支持 custom 类型
- [ ] 数据源配置界面

---

## 9. 技术选型

| 模块 | 技术方案 |
|------|---------|
| JSON Schema 编辑器 | `@monaco-editor/react` 或 `react-codemirror` |
| json-render 渲染 | `json-render` (npm package) |
| 状态管理 | Zustand (复用现有) |
| API | FastAPI + SQLAlchemy |
| 数据库 | SQLite (复用现有) |

---

## 10. 注意事项

1. **安全性**: json-render 的 `onClick` 等事件需要白名单控制，防止 XSS
2. **性能**: 大型列表渲染需要考虑虚拟化
3. **兼容性**: 确保 json-render 支持的组件类型足够丰富
4. **版本管理**: Schema 变更需要记录版本历史