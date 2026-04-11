# 大屏配置 Agent 助手设计文档

> 参考项目：[shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 的 agent 架构

## 1. 概述

### 1.1 目标
为财经可视化大屏平台添加 AI Agent 助手，允许用户通过自然语言描述来操作大屏配置页面，例如：

> "添加一个折线图到大屏左上角约占整个屏幕的1/9，配置数据源为财经数据"

Agent 接收指令后，分解为原子操作，逐步执行并更新页面状态。

### 1.2 核心价值
- 降低操作门槛，用户无需学习拖拽、配置等专业交互
- 通过自然语言实现快速原型搭建
- 支持复杂配置的批量修改

---

## 2. 技术架构

### 2.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React + TypeScript | 现有项目技术栈 |
| 状态管理 | Zustand | 现有 dashboardStore |
| AI 接入 | cc-switch | 从 `~/.cc-switch/cc-switch.db` 读取配置，app_type="claude" |
| 通信协议 | SSE (Server-Sent Events) | 支持流式输出，实时反馈执行进度 |
| 后端框架 | FastAPI | 现有后端技术栈 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (React)                              │
├─────────────────────────────────────────────────────────────────┤
│  DashboardEdit 页面                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 左侧组件面板 │  │  中间画布    │  │ 右侧属性面板             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  AgentChatPanel (新增 - 底部对话框)                           ││
│  │  - 对话历史                                                  ││
│  │  - 输入框 + 发送按钮                                          ││
│  │  - 执行状态显示                                               ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                     Agent Service (前端)                         │
│  - sendMessage(message) → SSE stream                           │
│  - abort() → 中断执行                                            │
│  - 每次操作完成后自动同步画布状态                                  │
├─────────────────────────────────────────────────────────────────┤
│                      后端 (FastAPI)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /api/agent  │→ │ AIAgent     │→ │ AtomicOperationExecutor │  │
│  │ (SSE 路由)   │  │ (任务分解)   │  │ (执行原子操作)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              MemoryManager (文件持久化记忆)                     ││
│  │  - .memory/ 目录 + frontmatter 格式                          ││
│  │  - load_memory_prompt() → 注入 system prompt                 ││
│  │  - save_memory() / resolve_component_reference()             ││
│  │  - 四类记忆: user/feedback/project/reference                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                           ↓                                      │
│                    AIFactory ← CCSwitchConfig                    │
│                    (app_type="claude")                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 原子操作定义

### 3.1 概述
原子操作是 Agent 可执行的最小粒度动作，每个操作都有明确的输入参数和执行逻辑。

### 3.2 操作列表

| 操作 ID | 操作名称 | 输入参数 | 说明 |
|---------|----------|----------|------|
| `ADD_COMPONENT` | 添加组件 | `type`, `position`, `size` | 在指定位置添加指定类型组件 |
| `REMOVE_COMPONENT` | 删除组件 | `componentId` | 删除指定 ID 的组件 |
| `UPDATE_COMPONENT` | 更新组件 | `componentId`, `updates` | 更新组件的标题/数据源/图表配置等 |
| `MOVE_COMPONENT` | 移动组件 | `componentId`, `position` | 将组件移动到新位置 |
| `RESIZE_COMPONENT` | 调整大小 | `componentId`, `size` | 调整组件宽高 |
| `SELECT_COMPONENT` | 选中组件 | `componentId` | 选中画布上的组件（用于后续操作） |
| `UPDATE_THEME` | 更新主题 | `theme` | 切换大屏主题 |
| `UPDATE_DASHBOARD_NAME` | 更新大屏名称 | `name` | 修改大屏名称 |
| `SAVE_DASHBOARD` | 保存大屏 | 无 | 触发保存 |
| `QUERY_DATA` | 查询数据 | `sql`, `sourceType` | 执行 SQL 查询并返回结果（用于验证） |

### 3.3 ADD_COMPONENT 详细说明

**输入参数：**
```typescript
{
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'candlestick' | 'number' | 'table';
  position: {
    x: number;      // 网格列起始位置 (0-23)
    y: number;      // 网格行起始位置
  };
  size: {
    w: number;      // 宽度 (网格列数)
    h: number;      // 高度 (网格行数)
  };
  dataSource?: {
    sourceType: 'finance-sql' | 'sql' | 'dataset' | 'api';
    sql?: string;
  };
}
```

**位置解析规则（自然语言 → 网格坐标）：**
- "左上角" → `x: 0, y: 0`
- "右上角" → `x: 16 (COLS=24时), y: 0`
- "中间" → `x: 8, y: 6`
- "约占 1/9" → `w: 8, h: 8` (COLS=24, 整个画布 24x12，则 1/9 ≈ 8x4)

### 3.4 操作执行器接口

```typescript
// backend/app/agent/operation_executor.py

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator

class AtomicOperation(ABC):
    """原子操作基类"""

    @property
    @abstractmethod
    def operation_id(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @abstractmethod
    async def execute(self, params: dict) -> dict:
        """执行操作，返回结果"""
        pass

    @abstractmethod
    async def validate(self, params: dict) -> tuple[bool, str]:
        """验证参数是否合法"""
        pass


class OperationExecutor:
    """操作执行器，管理所有原子操作"""

    def __init__(self, store: DashboardStore):
        self.store = store
        self.operations: dict[str, AtomicOperation] = {}
        self._register_operations()

    def _register_operations(self):
        self.operations["ADD_COMPONENT"] = AddComponentOperation(self.store)
        self.operations["REMOVE_COMPONENT"] = RemoveComponentOperation(self.store)
        self.operations["UPDATE_COMPONENT"] = UpdateComponentOperation(self.store)
        self.operations["MOVE_COMPONENT"] = MoveComponentOperation(self.store)
        self.operations["RESIZE_COMPONENT"] = ResizeComponentOperation(self.store)
        self.operations["SELECT_COMPONENT"] = SelectComponentOperation(self.store)
        self.operations["UPDATE_THEME"] = UpdateThemeOperation(self.store)
        self.operations["UPDATE_DASHBOARD_NAME"] = UpdateDashboardNameOperation(self.store)
        self.operations["SAVE_DASHBOARD"] = SaveDashboardOperation(self.store)

    async def execute(self, operation_id: str, params: dict) -> dict:
        if operation_id not in self.operations:
            raise ValueError(f"Unknown operation: {operation_id}")
        op = self.operations[operation_id]
        valid, msg = await op.validate(params)
        if not valid:
            raise ValueError(f"Validation failed: {msg}")
        return await op.execute(params)
```

---

## 4. Agent 对话接口设计

### 4.1 后端 API

**POST `/api/agent/chat`**

请求体：
```typescript
{
  message: string;           // 用户自然语言输入
  dashboardId?: string;      // 当前大屏 ID（可选，新建时为空）
  context: {
    components: ComponentConfig[];   // 当前组件列表
    layout: LayoutItem[];            // 当前布局
    dashboardName: string;
    theme: ThemeType;
  };
}
```

响应：**SSE 流**

每个事件格式：
```typescript
{
  type: 'message' | 'operation_start' | 'operation_complete' | 'error' | 'done';
  content: string;
  operation?: {
    id: string;
    type: string;
    params: dict;
    result?: dict;
  };
}
```

完整事件流示例：
```
type: message
content: "收到您的请求，正在分析..."

type: message
content: "我将执行以下操作：\n1. 添加折线图组件\n2. 配置财经数据源"

type: operation_start
content: "正在添加折线图..."
operation: { id: "op_1", type: "ADD_COMPONENT", params: {...} }

type: operation_complete
content: "折线图添加成功"
operation: { id: "op_1", type: "ADD_COMPONENT", params: {...}, result: { componentId: "abc123" } }

type: canvas_sync
content: "画布状态已更新"
canvas_state: { components: [...], layout: [...] }  ← 执行完立即同步到前端

type: message
content: "正在配置数据源..."

type: operation_start
operation: { id: "op_2", type: "UPDATE_COMPONENT", params: {...} }

type: operation_complete
operation: { id: "op_2", result: { success: true } }

type: canvas_sync
canvas_state: { components: [...], layout: [...] }

type: done
content: "所有操作已完成"
```

**画布状态同步机制**：
- 每个 `operation_complete` 事件后，都会跟随一个 `canvas_sync` 事件
- 前端收到 `canvas_sync` 后，立即更新本地 store（`dashboardStore`）
- 画布 UI 自动重新渲染，无需等待所有操作完成
- 这种增量同步保证了用户看到的状态始终是最新的

### 4.2 前端 AgentChatPanel

**UI 结构：**
```
┌──────────────────────────────────────────────────────────────┐
│  Agent 助手                                      [_] [×]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Agent] 您好！我是大屏配置助手，可以用自然语言描述您的需求。   │
│          例如："添加一个折线图到左上角"                        │
│                                                              │
│  [User] 添加一个折线图到大屏左上角约占1/9                     │
│                                                              │
│  [Agent] 收到！我将执行以下操作：                             │
│         1. 添加折线图组件到 (0, 0)，尺寸 8x4                 │
│         2. 配置数据源为财经数据                              │
│                                                              │
│         ✓ 添加折线图完成                                      │
│         ✓ 配置数据源完成                                      │
│                                                              │
│  [Agent] 已完成！折线图已添加到画布。                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [输入框...............................] [发送]              │
└────────────────────────────────────────────────────────────┘
```

**组件 Props：**
```typescript
interface AgentChatPanelProps {
  visible: boolean;
  onClose: () => void;
  dashboardContext: {
    dashboardId: string | null;
    components: ComponentConfig[];
    layout: LayoutItem[];
    dashboardName: string;
    theme: ThemeType;
  };
  onOperationExecuted: (operations: ExecutedOperation[]) => void;
}
```

**状态管理扩展（dashboardStore）：**

```typescript
// Agent 状态（扩展到现有 dashboardStore）
interface AgentState {
  // 对话历史
  messages: AgentMessage[];
  // 当前执行状态
  executing: boolean;
  currentOperation: string | null;
  // 操作历史（用于撤销/重做）
  operationHistory: ExecutedOperation[];
}

// 新增 actions
interface AgentActions {
  sendMessage: (message: string) => Promise<void>;
  abortExecution: () => void;
  clearMessages: () => void;
  // 画布状态同步（由 SSE canvas_sync 事件触发）
  syncCanvasState: (components: ComponentConfig[], layout: LayoutItem[]) => void;
}
```

**画布同步流程（SSE → Store）：**
```typescript
// AgentChatPanel.tsx 中处理 SSE
const eventSource = new EventSource(`/api/agent/chat`, ...);

eventSource.on('canvas_sync', (event) => {
  const { components, layout } = JSON.parse(event.data);
  dashboardStore.getState().syncCanvasState(components, layout);
  // 画布自动 re-render
});
```

---

## 5. Agent 指令解析（LLM Prompt 设计）

### 5.1 系统提示词

```python
AGENT_SYSTEM_PROMPT = """你是一个专业的大屏配置助手。你的任务是将用户的自然语言指令分解为可执行的原子操作。

## 你的能力
你可以执行以下原子操作：
1. ADD_COMPONENT - 在画布上添加新组件
2. REMOVE_COMPONENT - 删除组件
3. UPDATE_COMPONENT - 更新组件属性（标题、数据源、图表配置等）
4. MOVE_COMPONENT - 移动组件位置
5. RESIZE_COMPONENT - 调整组件大小
6. SELECT_COMPONENT - 选中组件
7. UPDATE_THEME - 更新大屏主题
8. UPDATE_DASHBOARD_NAME - 更新大屏名称
9. SAVE_DASHBOARD - 保存大屏

## 画布规格
- 网格列数：24
- 行高：50px
- 位置表示：左上角为 (0, 0)

## 操作参数规范

### ADD_COMPONENT
```json
{
  "type": "line|bar|pie|gauge|candlestick|number|table",
  "position": {"x": 0-23, "y": 0+},
  "size": {"w": 1-24, "h": 1+},
  "dataSource": {"sourceType": "finance-sql|sql", "sql": "SQL语句"}
}
```

### UPDATE_COMPONENT
```json
{
  "componentId": "组件ID",
  "updates": {
    "title": "新标题",
    "dataSource": {...},
    "chartConfig": {...}
  }
}
```

## 输出格式
你必须以 JSON 数组格式输出操作列表，每项包含：
- operation: 操作类型
- params: 操作参数
- description: 操作描述（用于向用户展示）

示例：
用户："在左上角添加一个折线图，约占1/9屏幕"
响应：
```json
[
  {
    "operation": "ADD_COMPONENT",
    "params": {
      "type": "line",
      "position": {"x": 0, "y": 0},
      "size": {"w": 8, "h": 4},
      "dataSource": {"sourceType": "finance-sql", "sql": "SELECT month as name, sales as value FROM monthly_sales ORDER BY month"}
    },
    "description": "在左上角添加折线图"
  }
]
```

## 重要原则
1. 只输出 JSON，不要有其他内容
2. 所有操作必须可执行，参数必须完整
3. 如果用户描述模糊，尽量做出合理推断
4. 组件默认数据源使用 finance-sql 类型
5. 操作执行后会实时反馈，用户可以看到进度
"""
```

### 5.2 自然语言 → 操作映射示例

| 用户输入 | 解析结果 |
|----------|----------|
| "添加一个折线图到大屏左上角" | `ADD_COMPONENT { type: 'line', position: {x:0,y:0}, size: {w:6,h:4} }` |
| "添加一个柱状图到右上角，约占1/4" | `ADD_COMPONENT { type: 'bar', position: {x:12,y:0}, size: {w:12,h:6} }` |
| "把中间那个图表删掉" | `REMOVE_COMPONENT { componentId: <推断的ID> }` |
| "换成一个饼图" | `UPDATE_COMPONENT { type: 'pie' }` |
| "改成科技蓝主题" | `UPDATE_THEME { theme: 'blue' }` |
| "标题改成销售报表" | `UPDATE_COMPONENT { title: '销售报表' }` |
| "调整大小占满整个屏幕" | `RESIZE_COMPONENT { w: 24, h: 12 }` |

---

## 6. cc-switch 集成

### 6.1 app_type 配置
直接复用 `app_type = "claude"`，与 genui 项目保持一致。

### 6.2 上下文记忆系统

参考 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 的 Memory System (s09)，采用**文件持久化 + 提示词注入**模式：

#### 6.2.1 存储结构

```
backend/.memory/                    # 记忆存储根目录
├── MEMORY.md                       # 记忆索引文件
├── user_preferences.md             # 用户偏好
├── feedback_corrections.md         # 用户纠正历史
├── project_conventions.md          # 项目约定
└── canvas_context.md               # 画布上下文（会话级）

每个记忆文件使用 frontmatter 格式：
---
name: user_preferences
description: 用户交互偏好
type: user
---
记忆内容...
```

#### 6.2.2 四种记忆类型

| 类型 | 说明 | 时机 |
|------|------|------|
| `user` | 用户偏好 | 用户说"我喜欢..." |
| `feedback` | 纠正历史 | 用户说"不要..."、"上次错了因为..." |
| `project` | 项目约定 | 非代码能推导的项目决策原因 |
| `reference` | 外部资源指针 | Dashboard URL、数据源位置等 |

#### 6.2.3 MemoryManager 实现

```python
# backend/app/agent/memory.py

from pathlib import Path
import re
from dataclasses import dataclass
from typing import Optional

MEMORY_DIR = Path("backend/.memory")
MEMORY_TYPES = ("user", "feedback", "project", "reference")
MAX_INDEX_LINES = 200


class MemoryManager:
    """记忆管理器 - 从文件加载、构建提示词、保存记忆"""

    def __init__(self, memory_dir: Path = MEMORY_DIR):
        self.memory_dir = memory_dir
        self.memories: dict[str, dict] = {}

    def load_all(self):
        """会话启动时加载所有记忆"""
        self.memories = {}
        if not self.memory_dir.exists():
            return
        for md_file in sorted(self.memory_dir.glob("*.md")):
            if md_file.name == "MEMORY.md":
                continue
            parsed = self._parse_frontmatter(md_file.read_text())
            if parsed:
                name = parsed.get("name", md_file.stem)
                self.memories[name] = parsed

    def load_memory_prompt(self) -> str:
        """构建注入到 system prompt 的记忆段落"""
        if not self.memories:
            return ""
        sections = ["# Memories (persistent across sessions)", ""]
        for mem_type in MEMORY_TYPES:
            typed = {k: v for k, v in self.memories.items() if v.get("type") == mem_type}
            if not typed:
                continue
            sections.append(f"## [{mem_type}]")
            for name, mem in typed.items():
                sections.append(f"### {name}: {mem.get('description', '')}")
                if mem.get("content", "").strip():
                    sections.append(mem.get("content", "").strip())
                sections.append("")
        return "\n".join(sections)

    def save_memory(self, name: str, description: str, mem_type: str, content: str) -> str:
        """保存记忆到磁盘"""
        if mem_type not in MEMORY_TYPES:
            return f"Error: type must be one of {MEMORY_TYPES}"

        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", name.lower())
        self.memory_dir.mkdir(parents=True, exist_ok=True)

        frontmatter = (
            f"---\n"
            f"name: {name}\n"
            f"description: {description}\n"
            f"type: {mem_type}\n"
            f"---\n"
            f"{content}\n"
        )
        file_path = self.memory_dir / f"{safe_name}.md"
        file_path.write_text(frontmatter)

        self.memories[name] = {
            "description": description,
            "type": mem_type,
            "content": content,
            "file": f"{safe_name}.md",
        }
        self._rebuild_index()
        return f"Saved memory '{name}' [{mem_type}]"

    def get_canvas_context(self) -> str:
        """获取当前画布状态摘要（用于 LLM 理解上下文）"""
        if not self.memories.get("canvas_context"):
            return "（空画布）"
        return self.memories["canvas_context"].get("content", "")

    def update_canvas_context(self, components: list, layout: list):
        """更新画布上下文记忆"""
        summary = []
        for i, comp in enumerate(components):
            summary.append(
                f"{i+1}. {comp.get('type', 'unknown')} - "
                f"ID: {comp.get('id', '')[:8]}... - "
                f"标题: {comp.get('title', '未命名')} - "
                f"位置: ({comp.get('layout', {}).get('x', 0)}, {comp.get('layout', {}).get('y', 0)})"
            )
        content = "\n".join(summary) if summary else "（空画布）"
        self.save_memory(
            name="canvas_context",
            description="当前画布组件状态",
            mem_type="project",
            content=content
        )

    def resolve_component_reference(self, user_message: str) -> Optional[dict]:
        """
        根据用户描述解析组件引用

        用户说"把那个折线图删掉" → 从 canvas_context 中查找 type='line' 的组件
        """
        canvas_ctx = self.get_canvas_context()
        if not canvas_ctx or canvas_ctx == "（空画布）":
            return None

        # 简单的模式匹配
        user_msg_lower = user_message.lower()
        for comp in reversed(canvas_ctx.split("\n")):
            if "折线图" in user_msg_lower and "line" in comp:
                # 提取 ID
                match = re.search(r"ID: (\w+)", comp)
                if match:
                    return {"componentId": match.group(1), "source": "canvas_context"}
            if "柱状图" in user_msg_lower and "bar" in comp:
                match = re.search(r"ID: (\w+)", comp)
                if match:
                    return {"componentId": match.group(1), "source": "canvas_context"}
            if "饼图" in user_msg_lower and "pie" in comp:
                match = re.search(r"ID: (\w+)", comp)
                if match:
                    return {"componentId": match.group(1), "source": "canvas_context"}
            if "第一个" in user_msg_lower:
                match = re.search(r"ID: (\w+)", canvas_ctx.split("\n")[0])
                if match:
                    return {"componentId": match.group(1), "source": "first_component"}

        return None

    def _parse_frontmatter(self, text: str) -> Optional[dict]:
        """解析 --- 分隔的 frontmatter"""
        match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
        if not match:
            return None
        header, body = match.group(1), match.group(2)
        result = {"content": body.strip()}
        for line in header.splitlines():
            if ":" in line:
                key, _, value = line.partition(":")
                result[key.strip()] = value.strip()
        return result

    def _rebuild_index(self):
        """重建 MEMORY.md 索引"""
        lines = ["# Memory Index", ""]
        for name, mem in self.memories.items():
            lines.append(f"- {name}: {mem.get('description', '')} [{mem.get('type', '')}]")
        if len(lines) >= MAX_INDEX_LINES:
            lines.append(f"... (truncated at {MAX_INDEX_LINES} lines)")
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        (self.memory_dir / "MEMORY.md").write_text("\n".join(lines) + "\n")
```

#### 6.2.4 记忆使用时机

| 时机 | 记忆类型 | 示例 |
|------|----------|------|
| 用户说"我喜欢用暗色主题" | `user` | `save_memory("theme_preference", "主题偏好", "user", "偏好暗色主题")` |
| 用户纠正"不要用那个数据源" | `feedback` | `save_memory("datasource_feedback", "数据源反馈", "feedback", "不要使用ds_finance_01")` |
| 用户解释项目决策 | `project` | `save_memory("chart_standard", "图表规范", "project", "所有K线图必须使用finance-sql")` |
| 外部资源引用 | `reference` | `save_memory("finance_db_path", "财经数据库路径", "reference", "backend/finance.db")` |

### 6.3 记忆系统在 Agent 执行流程中的使用

```
用户输入: "把那个折线图删掉"
         ↓
MemoryManager.resolve_component_reference()
  → 读取 canvas_context 记忆
  → 匹配 "折线图" 和 "line"
  → 提取 componentId: "abc123"
         ↓
生成操作: REMOVE_COMPONENT { componentId: "abc123" }
         ↓
执行完成后: MemoryManager.update_canvas_context(新components, 新layout)
```

---

## 7. cc-switch 集成

### 6.1 参考 genui 项目实现

从 `~/.cc-switch/cc-switch.db` 读取 AI Provider 配置：

```python
# backend/app/ai/ccswitch.py

import sqlite3
import json
from pathlib import Path
from typing import Optional

CC_SWITCH_DB_PATH = Path.home() / ".cc-switch" / "cc-switch.db"

class CCSwitchConfig:
    @staticmethod
    def get_current_provider(app_type: str = "dashboard") -> Optional[dict]:
        """获取当前激活的 AI Provider"""
        if not CC_SWITCH_DB_PATH.exists():
            return None

        conn = sqlite3.connect(str(CC_SWITCH_DB_PATH))
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name, settings_config FROM providers WHERE app_type = ? AND is_current = 1 LIMIT 1",
            (app_type,)
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        name, settings_config_json = row
        settings = json.loads(settings_config_json)
        env = settings.get("env", {})

        return {
            "name": name,
            "api_key": env.get("ANTHROPIC_AUTH_TOKEN", ""),
            "base_url": env.get("ANTHROPIC_BASE_URL", ""),
            "model": env.get("ANTHROPIC_MODEL") or env.get("ANTHROPIC_DEFAULT_SONNET_MODEL", ""),
            "api_format": settings.get("meta", {}).get("apiFormat", "anthropic"),
        }
```

### 6.2 Provider 选择逻辑

```python
# backend/app/ai/provider_factory.py

from .provider import AnthropicFormatProvider, AIFactory

def create_dashboard_agent_provider():
    """为 Dashboard Agent 创建 AI Provider"""
    config = CCSwitchConfig.get_current_provider(app_type="dashboard")

    if not config or not config["api_key"]:
        raise RuntimeError("未检测到 cc-switch 配置的 AI Provider，请先在 cc-switch 中配置")

    # 根据 provider 名称选择实现类
    name = config["name"].lower()
    if "minimax" in name:
        provider_class = MiniMaxProvider
    elif "deepseek" in name:
        provider_class = DeepSeekProvider
    elif "bailian" in name or "通义" in config["name"]:
        provider_class = BailianProvider
    else:
        provider_class = AnthropicFormatProvider

    return provider_class(
        api_key=config["api_key"],
        base_url=config["base_url"],
        model=config["model"]
    )
```

---

## 7. 目录结构

```
backend/
├── app/
│   ├── routers/
│   │   └── agent.py              # Agent SSE 路由
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── agent.py              # Agent 主逻辑（任务分解、调用执行器）
│   │   ├── memory.py             # 文件持久化记忆管理器
│   │   ├── operation_executor.py # 原子操作执行器
│   │   ├── operations/            # 各操作的实现
│   │   │   ├── __init__.py
│   │   │   ├── add_component.py
│   │   │   ├── remove_component.py
│   │   │   ├── update_component.py
│   │   │   └── ...
│   │   └── prompts.py            # Prompt 模板
│   └── ai/
│       ├── __init__.py
│       ├── ccswitch.py           # cc-switch 配置读取
│       └── provider_factory.py   # Provider 工厂
│
frontend/src/
├── components/
│   └── agent/
│       ├── AgentChatPanel.tsx    # Agent 对话面板组件
│       ├── AgentMessage.tsx     # 消息气泡
│       └── AgentChatPanel.css   # 样式
├── services/
│   └── agentApi.ts               # Agent API 调用（SSE）
├── stores/
│   └── agentStore.ts             # Agent 状态管理（可选，扩展 dashboardStore）
├── pages/
│   └── DashboardEdit.tsx         # 编辑页面（集成 AgentChatPanel）
```

---

## 8. 实现计划

### Phase 1: 后端基础 (2-3 天)

1. **cc-switch 集成**
   - 实现 `CCSwitchConfig` 读取配置
   - 实现 `ProviderFactory` 创建 Provider
   - 添加 `/api/cc-switch/status` 端点检测 cc-switch 是否可用

2. **原子操作执行器**
   - 定义 `AtomicOperation` 基类
   - 实现 `ADD_COMPONENT` 操作
   - 实现其他基础操作（REMOVE, UPDATE, MOVE, RESIZE）
   - 实现 `OperationExecutor` 编排器

3. **Agent 核心**
   - 实现 `AIAgent` 类（任务分解、LLM 调用）
   - 实现 `/api/agent/chat` SSE 端点
   - 实现流式输出逻辑

### Phase 2: 前端基础 (2-3 天)

1. **AgentChatPanel 组件**
   - 基础 UI（对话历史、输入框）
   - SSE 消息接收与渲染
   - 执行状态展示

2. **前端状态集成**
   - 扩展 dashboardStore 添加 agent 相关状态
   - 实现 `sendMessage` 和 `abortExecution` action
   - 操作执行回调更新画布

3. **DashboardEdit 集成**
   - 添加 AgentChatPanel 到页面底部
   - 实现显示/隐藏控制

### Phase 3: 交互优化 (1-2 天)

1. **撤销/重做**
   - 操作历史记录
   - Undo/Redo 功能

2. **智能推断**
   - 当用户说"那个图表"时，根据上下文推断组件
   - 支持"先...然后..."多步操作

3. **错误处理**
   - LLM 返回格式错误时的处理
   - 操作执行失败时的恢复

---

## 9. 待解决问题

以下问题已由用户确认：

1. ✅ **app_type 复用**：直接复用 `app_type = "claude"`，与 genui 保持一致
2. ✅ **上下文记忆**：采用 learn-claude-code 的文件持久化记忆系统，`.memory/` 目录 + frontmatter 格式，`MemoryManager` 管理四类记忆（user/feedback/project/reference），`resolve_component_reference()` 支持"那个折线图"等引用解析
3. ✅ **画布状态同步**：每个 `operation_complete` 后跟随 `canvas_sync` 事件，前端增量同步 dashboardStore，画布自动重渲染

---

## 10. 附录

### A. 参考项目

| 项目 | 说明 |
|------|------|
| [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) | Agent 核心机制教学：Agent Loop、Tool Use、Memory System、Todo/Planning、Error Recovery 等 |
| `d:/hans/genui/backend/ai/provider.py` | cc-switch provider 完整实现 |
| `d:/hans/genui/backend/agent/ui_agent.py` | Agent 任务分解和执行模式参考 |

### B. learn-claude-code 核心章节索引

| 章节 | 主题 | 关键机制 |
|------|------|----------|
| s01 | Agent Loop | `messages → model → tool_use → tool_result → loop` |
| s02 | Tool Use | `TOOL_HANDLERS` 分发映射，`normalize_messages()` 消息规范化 |
| s03 | Todo/Planning | `TodoManager` 会话计划，支持多步骤任务 |
| s09 | Memory System | `MemoryManager` 文件持久化，`load_memory_prompt()` 注入 system prompt |

### C. 本项目相关文件

| 文件 | 说明 |
|------|------|
| `d:/hans/dashboard/frontend/src/stores/dashboardStore.ts` | 状态管理 |
| `d:/hans/dashboard/frontend/src/pages/DashboardEdit.tsx` | 编辑页面 |
| `d:/hans/dashboard/frontend/src/types/index.ts` | 类型定义 |
