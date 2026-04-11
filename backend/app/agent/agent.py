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
   参数: type, position{x,y}, size{w,h}, dataSource{sourceType,sql}, title

2. REMOVE_COMPONENT - 删除组件
   参数: componentId

3. UPDATE_COMPONENT - 更新组件属性
   参数: componentId, updates{title,dataSource,chartConfig}

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
当前画布状态会通过变量提供，你可以根据组件 ID 或描述来引用组件。

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
    llm_provider
) -> list[dict]:
    """
    调用 LLM 生成操作列表

    Args:
        user_request: 用户自然语言输入
        canvas_context: 当前画布状态描述
        llm_provider: AI provider 实例

    Returns:
        操作列表
    """
    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": ANALYSIS_PROMPT.format(
            user_request=user_request,
            canvas_context=canvas_context or "（空画布）"
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
            operations = await generate_operations(
                user_message,
                canvas_context,
                provider
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
                result, new_state = await self.executor.execute(operation_id, params, current_state)
                current_state = new_state

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
