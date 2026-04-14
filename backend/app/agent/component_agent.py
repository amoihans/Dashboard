"""
AmisComponentAgent
==================
Agent specifically designed for building amis JSON components.
Uses skills and documentation to generate accurate amis configurations.
"""
import json
import re
import uuid
from typing import AsyncGenerator, Optional

from app.ai import create_dashboard_agent_provider
from .skill_loader import build_skill_context


# System prompt for amis component building
AMIS_COMPONENT_SYSTEM_PROMPT = """你是一个专业的 amis JSON 组件生成助手。

## 你的任务
根据用户的自然语言描述，生成符合 amis 规范的完整 JSON 配置。

## 核心规则

### 1. 组件类型选择
根据用户需求选择合适的组件类型：
- 页面/容器 → `page`
- 表格列表 → `crud` 或 `table`
- 表单 → `form`
- 卡片列表 → `cards`
- 单个卡片 → 使用 wrapper + tpl 组合（避免使用 card 类型）
- 标签页 → `tabs`
- 按钮 → `button`
- 图表 → `chart`
- 对话框 → `dialog`
- 静态文本 → `tpl` 或 `plain`
- 网格布局 → `grid`
- 弹性布局 → `wrapper` 替代 `flex`（SDK 兼容性更好）

### 2. SDK 兼容性
**重要**： amis SDK 2.0 不支持以下组件类型，请勿使用：
- `flex` - 使用 `wrapper` 替代
- `card` - 使用 `wrapper` + `tpl` 组合替代
- `flexItem` - 使用 `wrapper` 替代

### 3. 组件嵌套方式
- 页面级别 → `body: [...]`
- 网格布局 → `columns: [{body: [...]}, ...]`
- 标签页 → `tabs: [{title, body: [...]}, ...]`
- 表单 → `body: [...]`

### 4. 数据绑定
- 静态数据 → `data: {items: [...]}`
- API 数据 → `api: "get:/api/xxx"`
- 变量引用 → `${fieldName}`

### 5. 示例数据
始终提供 `exampleData` 字段，包含示例数据用于预览。

## 输出格式
生成完整的 amis JSON，必须包含：
1. `type`: "page"（最外层）
2. `title`: 页面标题
3. `body`: 组件内容
4. `exampleData`: 示例数据

## 组件文档参考
下面的文档会提供更详细的组件配置信息，请务必参考。
"""


def extract_keywords(user_message: str) -> list[str]:
    """Extract keywords from user message to find relevant docs."""
    # Remove common stopwords
    stopwords = {"一个", "创建", "生成", "显示", "一个", "帮我", "给我", "我要", "需要", "请", "能", "可以"}
    words = re.findall(r'[\w]+', user_message.lower())
    return [w for w in words if w not in stopwords and len(w) > 1]


def parse_amis_json(response: str) -> dict:
    """
    Parse amis JSON from LLM response.

    Handles:
    1. JSON in markdown code blocks
    2. Raw JSON
    3. JSON with explanation text
    """
    if not response:
        return {}

    # Try to find JSON in markdown code blocks first
    code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response, re.IGNORECASE)
    if code_block_match:
        json_str = code_block_match.group(1)
    else:
        # Try to find JSON object/array
        json_str = response

    # Try to extract JSON object
    json_match = re.search(r'\{[\s\S]*\}', json_str)
    if json_match:
        try:
            result = json.loads(json_match.group())
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    # Try to extract JSON array
    array_match = re.search(r'\[[\s\S]*\]', json_str)
    if array_match:
        try:
            result = json.loads(array_match.group())
            if isinstance(result, list):
                # Wrap in page if it's a list
                return {"type": "page", "body": result}
        except json.JSONDecodeError:
            pass

    return {}


class AmisComponentAgent:
    """
    Agent for building amis components.

    Features:
    - Dynamically loads skills and documentation
    - Generates SDK-compatible amis JSON
    - Supports multi-turn conversation
    """

    def __init__(self):
        self._provider = None
        self._provider_name = None
        self.conversation_history: list[dict] = []

    def _get_provider(self):
        """Get or initialize AI Provider"""
        if self._provider is None:
            result = create_dashboard_agent_provider()
            if result is None:
                raise RuntimeError("未检测到 cc-switch 配置的 AI Provider")
            self._provider, self._provider_name = result
            print(f"[AmisComponentAgent] Using provider: {self._provider_name}")
        return self._provider

    def reset(self):
        """Reset conversation history"""
        self.conversation_history = []

    async def chat(
        self,
        user_message: str,
        history: Optional[list[dict]] = None
    ) -> AsyncGenerator[dict, None]:
        """
        Process user message and yield events.

        Args:
            user_message: User's natural language description
            history: Previous conversation history

        Yields:
            dict events with type: message | schema | done | error
        """
        task_id = str(uuid.uuid4())[:8]
        full_response = ""

        try:
            # Build context by loading skills and relevant docs
            keywords = extract_keywords(user_message)
            skill_context = build_skill_context(
                skill_names=["amis-json"],
                keywords=keywords,
                include_docs=True
            )

            # Yield loading message
            yield {
                "type": "message",
                "content": "正在分析您的需求，加载相关文档...",
                "task_id": task_id,
            }

            # Build messages for LLM
            system_prompt = AMIS_COMPONENT_SYSTEM_PROMPT + "\n\n" + skill_context

            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history
            if history:
                for h in history:
                    messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

            messages.append({"role": "user", "content": user_message})

            # Call LLM
            provider = self._get_provider()
            response = await provider.chat(messages)
            full_response = response

            print(f"[AmisComponentAgent] LLM response length: {len(response)}")

            # Parse the amis JSON from response
            amis_schema = parse_amis_json(response)

            if not amis_schema:
                yield {
                    "type": "message",
                    "content": "无法生成有效的 amis JSON，请尝试更详细地描述组件需求。",
                    "task_id": task_id,
                }
                yield {"type": "error", "content": "Failed to parse amis JSON", "task_id": task_id}
                return

            # Yield the schema event
            schema_json = json.dumps(amis_schema, ensure_ascii=False, indent=2)
            yield {
                "type": "schema",
                "schema": schema_json,
                "task_id": task_id,
            }

            # Add explanation message
            explanation = self._generate_explanation(amis_schema)
            yield {
                "type": "message",
                "content": explanation,
                "task_id": task_id,
            }

            yield {"type": "done", "task_id": task_id}

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "content": f"发生错误: {str(e)}\n\n响应: {full_response[:500] if full_response else 'N/A'}",
                "task_id": task_id,
            }

    def _generate_explanation(self, schema: dict) -> str:
        """Generate explanation of the generated schema."""
        component_types = []

        def extract_types(obj):
            if isinstance(obj, dict):
                if "type" in obj:
                    component_types.append(obj["type"])
                for v in obj.values():
                    extract_types(v)
            elif isinstance(obj, list):
                for item in obj:
                    extract_types(item)

        extract_types(schema)

        unique_types = list(set(component_types))
        type_str = ", ".join(unique_types[:5])
        if len(unique_types) > 5:
            type_str += f" 等{len(unique_types)}种"

        return f"已生成组件配置，包含：{type_str}。您可以在右侧编辑器中查看和调整 JSON。"


# Global instance
component_agent = AmisComponentAgent()
