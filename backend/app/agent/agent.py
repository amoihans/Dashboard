"""
Agent 核心模块
负责任务分解、LLM 调用、原子操作执行
"""
import json
import re
import uuid
from typing import AsyncGenerator, Optional

from app.ai import create_dashboard_agent_provider
from .memory import memory_mgr, MemoryManager
from .operation_executor import OperationExecutor, OperationResult


# Agent 系统提示词
AGENT_SYSTEM_PROMPT = """你是一个专业的大屏配置助手。你的任务是将用户的自然语言指令分解为可执行的原子操作。

## 画布规格
- 网格列数：24
- 行高：50px
- 位置表示：左上角为 (0, 0)
- 自然语言位置：
  - "左上角" → x: 0, y: 0
  - "右上角" → x: 16, y: 0
  - "中间" → x: 8, y: 6
  - "约占1/9" → 整个画布约 24x12，1/9 ≈ 8x4

## 可用原子操作

1. ADD_COMPONENT - 添加新组件到画布
   参数: type, position{x,y}, size{w,h}, dataSource{sourceType,sql}, title, customComponentId, customComponentName

2. REMOVE_COMPONENT - 删除组件
   参数: componentId

3. UPDATE_COMPONENT - 更新组件属性
   参数: componentId, updates{title,dataSource,chartConfig,customOverrides}

4. MOVE_COMPONENT - 移动组件位置
   参数: componentId, position{x,y}

5. RESIZE_COMPONENT - 调整组件大小
   参数: componentId, size{w,h}

6. UPDATE_THEME - 切换大屏主题
   参数: theme (dark/light/blue/green/purple/red)

## 组件类型映射
- 折线图 → line
- 柱状图 → bar
- 饼图 → pie
- 仪表盘 → gauge
- K线图 → candlestick
- 数字卡片 → number
- 表格 → table
- 自定义组件/卡片 → custom

## 自定义组件支持
自定义组件通过 `customComponentId` 和 `customComponentName` 参数添加：
- 添加自定义组件：`ADD_COMPONENT` 的 type 为 "custom"，并提供 `customComponentId` 或 `customComponentName`
- 引用组件：可以使用组件的 title（标题）来引用组件，比如 "删除左上角的销售图表"
- 组件名称唯一性：每个组件都有唯一的 title，可以通过 title 来定位组件

## 数据源类型
- finance-sql: 财经模拟数据（默认）
- sql: 通用 SQL 查询
- dataset: 数据集
- api: API

## 默认 SQL（当用户没有指定数据源时使用 finance-sql）
- line: SELECT month as name, sales as value FROM monthly_sales ORDER BY month
- bar: SELECT region as name, q1 as value FROM regional_sales
- pie: SELECT category as name, revenue as value FROM product_revenue
- gauge: SELECT value FROM kpi_metrics WHERE metric_name='营业收入完成率'
- candlestick: SELECT trade_date as date, open_price as open, close_price as close, high_price as high, low_price as low FROM stock_price ORDER BY trade_date
- number: SELECT value FROM kpi_metrics WHERE metric_name='全年营收'
- table: SELECT department, employee_count, avg_salary, total_salary FROM department_stats

## 上下文记忆
当前画布状态会通过变量提供，你可以根据组件的 title（标题）来引用组件。例如：
- "删除销售图表" → 查找 title 包含 "销售" 的组件
- "移动左上角的卡片" → 查找位置和标题匹配的组件
- "更新折线图的数据源" → 查找 type 为 "line" 且 title 包含 "折线" 的组件

## 输出格式
必须以 JSON 数组格式输出操作列表，每项包含：
- operation: 操作类型
- params: 操作参数
- description: 操作描述（简短，用于向用户展示）

**重要：只输出 JSON，不要有其他内容。**
"""

# 解析 LLM 响应的提示词
ANALYSIS_PROMPT = """分析以下用户需求，分解为原子操作：

用户需求：{user_request}

当前画布状态：
{canvas_context}

自定义组件库（可用名称）：
{custom_components}

请分析用户需求，输出操作列表 JSON：
"""


def parse_llm_operations(response: str) -> list[dict]:
    """
    解析 LLM 返回的操作列表

    支持多种格式：
    1. 纯 JSON 数组
    2. Markdown 代码块中的 JSON
    3. 带有 explanation 的响应
    """
    if not response:
        return []

    # 尝试从 Markdown 代码块中提取 JSON
    code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response, re.IGNORECASE)
    if code_block_match:
        json_str = code_block_match.group(1)
    else:
        # 尝试直接解析整个响应
        json_str = response

    # 提取 JSON 数组
    json_match = re.search(r'\[[\s\S]*\]', json_str)
    if json_match:
        try:
            operations = json.loads(json_match.group())
            if isinstance(operations, list):
                return operations
        except json.JSONDecodeError:
            pass

    return []


async def generate_operations(
    user_request: str,
    canvas_context: str,
    llm_provider,
    custom_components: list = None
) -> list[dict]:
    """
    调用 LLM 生成操作列表

    Args:
        user_request: 用户自然语言输入
        canvas_context: 当前画布状态描述
        llm_provider: AI provider 实例
        custom_components: 自定义组件列表 [{id, name, description}]

    Returns:
        操作列表
    """
    # 构建自定义组件列表字符串
    custom_components_str = ""
    if custom_components:
        for c in custom_components:
            custom_components_str += f"- {c.get('name', '未命名')}: ID={c.get('id')}, 描述={c.get('description', '无')}\n"

    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": ANALYSIS_PROMPT.format(
            user_request=user_request,
            canvas_context=canvas_context or "（空画布）",
            custom_components=custom_components_str or "（无自定义组件）"
        )},
    ]

    response = await llm_provider.chat(messages)

    # 打印调试信息
    print(f"[Agent] LLM response: {response[:500]}...")

    operations = parse_llm_operations(response)

    if not operations:
        print(f"[Agent] Failed to parse operations from LLM response")
        return []

    print(f"[Agent] Parsed {len(operations)} operations")
    return operations


class DashboardAgent:
    """
    大屏配置 Agent

    负责：
    1. 接收用户自然语言输入
    2. 调用 LLM 分解为原子操作
    3. 执行操作并生成 SSE 事件流
    """

    def __init__(self):
        self.memory = memory_mgr
        self.executor = OperationExecutor()
        self._provider = None
        self._provider_name = None

    def _get_provider(self):
        """获取或初始化 AI Provider"""
        if self._provider is None:
            result = create_dashboard_agent_provider()
            if result is None:
                raise RuntimeError("未检测到 cc-switch 配置的 AI Provider，请先在 cc-switch 中配置")
            self._provider, self._provider_name = result
            print(f"[Agent] Using provider: {self._provider_name}")
        return self._provider

    async def chat(
        self,
        user_message: str,
        initial_state: dict
    ) -> AsyncGenerator[dict, None]:
        """
        处理用户消息，生成 SSE 事件流

        Args:
            user_message: 用户自然语言输入
            initial_state: 初始状态 {components, layout, theme}

        Yields:
            SSE 事件 dict
        """
        task_id = str(uuid.uuid4())[:8]

        # 1. 保存用户消息到记忆
        self.memory.load_all()
        self.memory.add_user_message(user_message)

        # 2. 更新画布上下文
        canvas_context = self.memory.get_canvas_context()
        self.memory.update_canvas_context(
            initial_state.get("components", []),
            initial_state.get("layout", [])
        )

        # 3. 发送欢迎消息
        yield {
            "type": "message",
            "content": "收到您的请求，正在分析...",
            "task_id": task_id,
        }

        try:
            # 4. 调用 LLM 生成操作
            provider = self._get_provider()
            custom_components = initial_state.get("customComponents", [])
            operations = await generate_operations(
                user_message,
                canvas_context,
                provider,
                custom_components
            )

            if not operations:
                yield {
                    "type": "message",
                    "content": "抱歉，我无法理解您的请求。请尝试更清晰地描述您想要的操作。",
                    "task_id": task_id,
                }
                yield {"type": "done", "content": "处理完成", "task_id": task_id}
                return

            # 5. 生成操作计划消息
            plan_lines = []
            for i, op in enumerate(operations, 1):
                desc = op.get("description", op.get("operation", ""))
                plan_lines.append(f"{i}. {desc}")

            print(f"[Agent] Operations to execute: {operations}")

            yield {
                "type": "message",
                "content": f"我将执行以下操作：\n{chr(10).join(plan_lines)}",
                "task_id": task_id,
            }

            # 6. 执行每个操作
            current_state = initial_state.copy()

            for i, op_spec in enumerate(operations):
                operation_id = op_spec.get("operation")
                params = op_spec.get("params", {})

                # 如果有 componentId 为空但用户提到了组件引用
                if not params.get("componentId") and operation_id in ("REMOVE_COMPONENT", "UPDATE_COMPONENT", "MOVE_COMPONENT", "RESIZE_COMPONENT"):
                    resolved = self.memory.resolve_component_reference(user_message)
                    if resolved:
                        params["componentId"] = resolved.get("componentId")

                yield {
                    "type": "operation_start",
                    "content": f"正在执行: {op_spec.get('description', operation_id)}...",
                    "operation": {
                        "id": f"op_{i+1}",
                        "type": operation_id,
                        "params": params,
                    },
                    "task_id": task_id,
                }

                # 执行操作
                print(f"[Agent] Executing operation: {operation_id} with params: {params}")
                result, new_state = await self.executor.execute(operation_id, params, current_state)
                current_state = new_state
                print(f"[Agent] Operation result: {result.success}, {result.message}")

                if result.success:
                    yield {
                        "type": "operation_complete",
                        "content": result.message,
                        "operation": {
                            "id": f"op_{i+1}",
                            "type": operation_id,
                            "params": params,
                            "result": result.data,
                        },
                        "task_id": task_id,
                    }

                    # 更新画布状态到记忆
                    self.memory.update_canvas_context(
                        current_state.get("components", []),
                        current_state.get("layout", [])
                    )
                else:
                    yield {
                        "type": "error",
                        "content": f"操作失败: {result.message}",
                        "operation": {
                            "id": f"op_{i+1}",
                            "type": operation_id,
                            "params": params,
                            "error": result.error,
                        },
                        "task_id": task_id,
                    }
                    break

                # 发送画布状态同步事件
                yield {
                    "type": "canvas_sync",
                    "content": "画布状态已更新",
                    "canvas_state": {
                        "components": current_state.get("components", []),
                        "layout": current_state.get("layout", []),
                        "theme": current_state.get("theme", initial_state.get("theme")),
                    },
                    "task_id": task_id,
                }

            # 7. 完成
            self.memory.add_assistant_message(f"执行了 {len(operations)} 个操作")
            yield {
                "type": "done",
                "content": "所有操作已完成",
                "task_id": task_id,
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "content": f"发生错误: {str(e)}",
                "task_id": task_id,
            }


# 全局 Agent 实例
agent = DashboardAgent()


# ========== 自定义组件构建 ==========

BUILD_COMPONENT_SYSTEM_PROMPT = """你是一个专业的自定义组件构建助手。你的任务是将用户的自然语言描述转换为通用的 JSON Schema 组件定义。

## 组件 Schema 格式 (version: "1.0")

```json
{
  "version": "1.0",
  "name": "组件名称",
  "dataFormat": {
    "description": "数据格式说明",
    "required": ["field1", "field2"]
  },
  "exampleData": [...],
  "root": {
    "component": "组件类型",
    "props": {...},
    "children": [...]
  }
}
```

## 支持的组件类型

| component | 说明 | 特殊字段 |
|-----------|------|---------|
| flex | 弹性布局容器 | direction (row/column), gap, wrap |
| card | 卡片容器 | - |
| tabs | Tab 切换容器 | tabs: [{key, label}] |
| table | 数据表格 | columns: [{key, label, width}] |
| heading | 标题 | level (1-6) |
| text | 文本 | value (支持 ${变量} 插值) |
| metric | 指标展示 | value, label, trend |
| list | 列表 | #each 循环 |
| divider | 分隔线 | - |
| space | 间距 | size |
| div/span/p/h1-h6/button/img | 基础 HTML | - |

## 变量插值格式
- \${field} - 取顶层字段
- \${item.field} - 取循环项的字段
- \${tabs[0].label} - 取数组元素

## 循环渲染
使用 #each 和 #eachItem：
```json
{
  "component": "list",
  "#each": "\${items}",
  "#eachItem": {
    "component": "div",
    "children": "\${item.name}"
  }
}
```

## 数据格式定义
根据组件需要定义数据格式，例如表格组件：
```json
{
  "description": "表格数据，每行包含名称和数值",
  "required": ["name", "value"],
  "structure": "数组类型，每项包含 name(字符串) 和 value(数值)"
}
```

## 输出要求
1. 必须返回有效的 JSON
2. 必须包含 version: "1.0"
3. 必须包含 root 字段
4. 必须包含 exampleData 作为示例数据
5. 组件名要简洁明确

**重要：只输出 JSON，不要有其他内容。**
"""


BUILD_COMPONENT_USER_PROMPT = """根据以下描述生成自定义组件 Schema：

{description}

请生成完整的组件定义 JSON：
"""


async def build_component(user_message: str) -> dict:
    """
    根据用户描述生成自定义组件的 Schema

    Args:
        user_message: 用户对组件的描述

    Returns:
        包含 schema, exampleData, dataFormat 的字典
    """
    from app.ai import create_dashboard_agent_provider

    provider_info = create_dashboard_agent_provider()
    if not provider_info:
        raise Exception("AI Provider not configured")

    provider, provider_name = provider_info

    # 构建消息列表
    messages = [
        {"role": "system", "content": BUILD_COMPONENT_SYSTEM_PROMPT},
        {"role": "user", "content": BUILD_COMPONENT_USER_PROMPT.format(description=user_message)},
    ]

    # 调用 LLM
    try:
        response = await provider.chat(messages)
    except Exception as e:
        raise Exception(f"AI call failed: {e}")

    # 解析响应
    try:
        # 尝试从 Markdown 代码块中提取 JSON
        code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response, re.IGNORECASE)
        if code_block_match:
            json_str = code_block_match.group(1)
        else:
            json_str = response

        # 提取 JSON 对象
        json_match = re.search(r'\{[\s\S]*\}', json_str)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            raise Exception("Failed to parse LLM response")

    except json.JSONDecodeError as e:
        raise Exception(f"JSON decode error: {e}\n\nOriginal response: {response[:500]}")
    except Exception as e:
        raise Exception(f"Build component failed: {e}")
