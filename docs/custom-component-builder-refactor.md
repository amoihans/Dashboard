# 自定义组件构建器重构设计文档

## 1. 概述

### 1.1 背景

当前的自定义组件构建器使用自定义 JSON Schema 格式，需要额外的解析和渲染逻辑。为了与 amis 生态更好地集成，将组件格式统一为 amis JSON，使用 amis 官方渲染器进行预览。

### 1.2 目标

1. **Agent 驱动的组件生成** - 使用 Claude API 生成符合 amis 格式的 JSON，支持多轮对话迭代
2. **实时预览** - 使用 `amis` 官方库渲染 JSON，实时反馈生成效果
3. **简化编辑** - 去掉结构编辑器，直接编辑 JSON
4. **健壮的错误处理** - 渲染错误不影响页面稳定

### 1.3 技术栈

- **渲染引擎**: `amis` SDK (`import { render } from 'amis'`)
- **Agent**: Claude API (通过 `/v1/messages` 接口)
- **状态管理**: Zustand store
- **前端**: React + TypeScript

---

## 2. 架构设计

### 2.1 页面布局

```
┌──────────────────────────────────────────────────────────────────┐
│                         顶部工具栏                                 │
│  [返回] [组件名称输入框] [描述输入框]              [保存按钮]       │
├────────────────┬─────────────────────────┬───────────────────────┤
│                │                         │                       │
│   左侧：Agent   │      中间：实时预览      │    右侧：JSON 编辑     │
│   对话区域      │                         │                       │
│   (360px)      │      (flex: 1)          │    (400px)            │
│                │                         │                       │
│  - 欢迎消息     │  ┌─────────────────┐   │  - JSON textarea      │
│  - 对话历史     │  │                 │   │  - 格式化按钮          │
│  - 输入框       │  │   Amis Render   │   │  - 错误提示            │
│  - 生成按钮     │  │                 │   │                       │
│                │  │                 │   │                       │
│                │  └─────────────────┘   │                       │
├────────────────┴─────────────────────────┴───────────────────────┤
│                         底部数据配置                               │
│  [Example/SQL 切换] [数据编辑器 textarea]                          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 组件结构

```
CustomComponentBuilder/
├── CustomComponentBuilder.tsx    # 主页面容器
├── AgentChat.tsx                 # 左侧 Agent 对话组件
├── AmisPreview.tsx              # 中间实时预览组件
├── JsonEditor.tsx               # 右侧 JSON 编辑器
├── DataConfig.tsx               # 底部数据配置
└── hooks/
    ├── useAgentChat.ts          # Agent 对话逻辑 hook
    ├── useAmisRenderer.ts        # amis 渲染逻辑 hook
    └── useSchemaValidation.ts    # JSON 验证 hook
```

---

## 3. 组件设计

### 3.1 AgentChat 组件

**职责**: 管理 Agent 对话，支持多轮对话生成 amis JSON

**Props**:
```typescript
interface AgentChatProps {
  schema: string;
  onSchemaChange: (schema: string) => void;
}
```

**状态**:
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  schemaDelta?: string;  // Agent 生成的 schema 增量
}

interface AgentChatState {
  messages: ChatMessage[];
  input: string;
  executing: boolean;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}
```

**Agent Prompt 设计**:
```
你是一个amis JSON生成专家。用户会描述他们想要的组件样式，
你需要生成符合amis规范的JSON配置。

要求：
1. 只输出JSON，不要有其他解释
2. JSON必须包含完整的type、body等必要字段
3. 使用标准的amis组件类型
4. 预留数据绑定表达式 ${xxx} 让数据可配置

对话历史：
${conversationHistory}

用户最新输入：${userInput}
```

### 3.2 AmisPreview 组件

**职责**: 使用 amis 官方渲染器渲染 JSON，处理渲染错误

**Props**:
```typescript
interface AmisPreviewProps {
  schema: Record<string, unknown>;
  data: Record<string, unknown>;
}
```

**错误处理策略**:
1. **JSON 解析错误**: 捕获 `JSON.parse` 异常，显示友好错误
2. **amis 渲染错误**: 使用 `try-catch` 包装 `amisRender()` 调用
3. **ErrorBoundary**: 捕获渲染树的未处理异常
4. **降级展示**: 错误时显示错误信息和原始 JSON

**实现参考**:
```typescript
// 使用 amis SDK 渲染
import { render } from 'amis';

// 错误处理包装
const SafeAmisRenderer: React.FC<Props> = ({ schema, data }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // 验证 schema
      if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema: expected object');
      }
      // amisRender 可能抛出异常
    } catch (e) {
      setError(e.message);
    }
  }, [schema]);

  if (error) {
    return <ErrorDisplay message={error} schema={schema} />;
  }

  return (
    <div className="amis-renderer">
      {amisRender(schema, { data }, { /* options */ })}
    </div>
  );
};
```

### 3.3 JsonEditor 组件

**职责**: 提供 JSON 文本编辑能力，带格式化功能

**Props**:
```typescript
interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}
```

**功能**:
1. **语法高亮**: 使用 Monaco Editor 或 CodeMirror
2. **格式化**: 一键格式化 JSON (2 空格缩进)
3. **验证**: 实时验证 JSON 语法
4. **最小化/展开**: 可折叠大文件

### 3.4 DataConfig 组件

**职责**: 配置组件数据源（Example Data 或 SQL）

**Props**:
```typescript
interface DataConfigProps {
  sourceType: 'inline' | 'sql';
  exampleData: Record<string, unknown>[];
  sql: string;
  onSourceTypeChange: (type: 'inline' | 'sql') => void;
  onExampleDataChange: (data: Record<string, unknown>[]) => void;
  onSqlChange: (sql: string) => void;
}
```

---

## 4. 状态设计

### 4.1 本地状态 (useState)

```typescript
// CustomComponentBuilder.tsx
const [schemaText, setSchemaText] = useState(DEFAULT_AMBIS_SCHEMA);
const [parsedSchema, setParsedSchema] = useState<Record<string, unknown> | null>(null);
const [schemaError, setSchemaError] = useState<string | null>(null);
const [sourceType, setSourceType] = useState<'inline' | 'sql'>('inline');
const [exampleData, setExampleData] = useState<Record<string, unknown>[]>([]);
const [sqlText, setSqlText] = useState('');
```

### 4.2 默认 Schema

```typescript
const DEFAULT_AMBIS_SCHEMA = {
  type: 'page',
  title: '新组件',
  body: [
    {
      type: 'flex',
      justify: 'space-between',
      items: [
        {
          type: 'card',
          body: [
            { type: 'tpl', tpl: '标题', className: 'text-lg font-bold' },
            { type: 'tpl', tpl: '${value}', className: 'text-2xl text-primary' }
          ]
        }
      ]
    }
  ]
};
```

---

## 5. 大屏编辑页面集成

### 5.1 自定义组件渲染

大屏编辑页面中的自定义组件通过 `AmisChart` 组件渲染：

```typescript
// 在 Dashboard 编辑页面中使用
<AmisChart
  customComponentId={component.customComponentId}
  overrides={component.customOverrides}
/>
```

### 5.2 错误边界

为防止渲染错误导致整个大屏崩溃，添加 ErrorBoundary：

```typescript
class AmisErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="amis-error-fallback">
          <Alert type="error" message="组件渲染错误" description={this.state.error?.message} />
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 6. API 设计

### 6.1 保存组件

```
POST /api/custom-components
{
  "name": "组件名称",
  "description": "组件描述",
  "category": "card",
  "json_schema": "{ \"type\": \"page\", ... }",  // amis JSON 字符串
  "data_source_config": "{ \"sourceType\": \"inline\", ... }"
}
```

### 6.2 Agent 对话

使用后端代理调用 Claude API：

```
POST /api/agent/chat
{
  "messages": [
    { "role": "user", "content": "创建一个卡片组件显示用户信息" }
  ],
  "systemPrompt": "你是一个amis JSON生成专家..."
}

Response:
{
  "content": "这是生成的JSON...",
  "schema": { "type": "page", ... }
}
```

---

## 7. 实现计划

### Phase 1: 基础框架
- [ ] 创建组件目录结构
- [ ] 实现 `AgentChat` 组件（对话 UI）
- [ ] 实现 `JsonEditor` 组件
- [ ] 实现 `DataConfig` 组件

### Phase 2: 预览功能
- [ ] 改进 `AmisPreview` 组件
- [ ] 添加 ErrorBoundary
- [ ] 集成数据配置

### Phase 3: Agent 集成
- [ ] 实现 `useAgentChat` hook
- [ ] 对接后端 Agent API
- [ ] 支持多轮对话

### Phase 4: 大屏集成
- [ ] 更新 `AmisChart` 组件
- [ ] 添加错误边界
- [ ] 测试预览功能

### Phase 5: 优化
- [ ] 格式化功能
- [ ] 快捷键支持
- [ ] 性能优化

---

## 8. 参考资料

- [amis 官方文档](https://aisuda.bce.baidu.com/amis/zh-CN/docs/index)
- [amis JSON 格式参考](../../skills/amis-json.md)
- [amis 组件文档](../../amis_docs/components/)
