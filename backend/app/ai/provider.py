"""
AI Provider 工厂模块
从 cc-switch 配置创建 AI Provider
"""
import httpx
from abc import ABC, abstractmethod
from typing import Optional, AsyncGenerator
import json

from .ccswitch import CCSwitchConfig


class AIProvider(ABC):
    """AI 服务提供商抽象基类"""

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = None):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    @abstractmethod
    async def chat(self, messages: list[dict], model: str = None) -> str:
        """发送对话请求，返回 AI 响应文本"""
        pass

    @abstractmethod
    async def chat_stream(self, messages: list[dict], model: str = None) -> AsyncGenerator[str, None]:
        """流式对话"""
        pass


class AnthropicFormatProvider(AIProvider):
    """使用 Anthropic API 格式的 Provider（如 MiniMax、DeepSeek、Bailian 等）"""

    def _get_api_url(self) -> str:
        """构建完整的 API URL"""
        base = self.base_url.rstrip("/")
        if "/v1" not in base:
            base += "/v1"
        return f"{base}/messages"

    async def chat(self, messages: list[dict], model: str = None, retry_count: int = 3) -> str:
        model = model or self.model or "claude-3-5-haiku-20240307"

        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }

        anthropic_messages = []
        for msg in messages:
            anthropic_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        payload = {
            "model": model,
            "max_tokens": 4096,
            "messages": anthropic_messages
        }

        last_error = None
        for attempt in range(retry_count):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        self._get_api_url(),
                        json=payload,
                        headers=headers,
                        timeout=120.0
                    )
                    response.raise_for_status()
                    data = response.json()

                    # 解析响应
                    if "content" in data:
                        content = data["content"]
                        if isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and "text" in item:
                                    return item["text"]
                            return str(content)
                        elif isinstance(content, str):
                            return content

                    if "text" in data:
                        return data["text"]

                    return str(data)

            except httpx.HTTPStatusError as e:
                last_error = e
                # 如果是 529 或其他服务器错误，等待后重试
                if e.response.status_code >= 500 and attempt < retry_count - 1:
                    import asyncio
                    wait_time = (attempt + 1) * 2  # 指数退避: 2s, 4s, 6s
                    print(f"[AIProvider] Server error {e.response.status_code}, retrying in {wait_time}s... (attempt {attempt + 1}/{retry_count})")
                    await asyncio.sleep(wait_time)
                    continue
                raise
            except Exception as e:
                last_error = e
                if attempt < retry_count - 1:
                    import asyncio
                    wait_time = (attempt + 1) * 2
                    print(f"[AIProvider] Error: {e}, retrying in {wait_time}s... (attempt {attempt + 1}/{retry_count})")
                    await asyncio.sleep(wait_time)
                    continue
                raise

        raise last_error or Exception("AI chat failed after retries")

    async def chat_stream(self, messages: list[dict], model: str = None) -> AsyncGenerator[str, None]:
        model = model or self.model or "claude-3-5-haiku-20240307"

        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }

        anthropic_messages = []
        for msg in messages:
            anthropic_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        payload = {
            "model": model,
            "max_tokens": 4096,
            "messages": anthropic_messages
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", self._get_api_url(), json=payload, headers=headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if data.get("type") == "content_block_delta":
                                delta = data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    yield delta.get("text", "")
                        except:
                            pass


class ClaudeProvider(AnthropicFormatProvider):
    """Anthropic 官方 Claude"""
    pass


class MiniMaxProvider(AnthropicFormatProvider):
    """MiniMax - Anthropic 兼容 API"""
    pass


class BailianProvider(AnthropicFormatProvider):
    """阿里百炼"""
    pass


class DeepSeekProvider(AnthropicFormatProvider):
    """DeepSeek"""
    pass


class OpenAIProvider(AIProvider):
    """OpenAI GPT"""

    async def chat(self, messages: list[dict], model: str = "gpt-4o-mini") -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        response = client.chat.completions.create(
            model=model,
            messages=messages
        )
        return response.choices[0].message.content

    async def chat_stream(self, messages: list[dict], model: str = "gpt-4o-mini") -> AsyncGenerator[str, None]:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class AIFactory:
    """AI 工厂类"""

    _provider_classes = {
        "claude": ClaudeProvider,
        "openai": OpenAIProvider,
        "minimax": MiniMaxProvider,
        "bailian": BailianProvider,
        "deepseek": DeepSeekProvider,
        "anthropic": ClaudeProvider,
    }

    @classmethod
    def create_provider_from_ccswitch(cls, app_type: str = "claude") -> Optional[tuple[AIProvider, str]]:
        """
        从 cc-switch 配置创建 provider
        返回: (provider实例, provider名称) 或 None
        """
        config = CCSwitchConfig.get_current_provider(app_type)
        if not config or not config["api_key"]:
            return None

        name = config["name"].lower()

        # 根据 provider 名称选择合适的类
        if "minimax" in name:
            provider_class = MiniMaxProvider
        elif "deepseek" in name:
            provider_class = DeepSeekProvider
        elif "bailian" in name or "通义" in config["name"]:
            provider_class = BailianProvider
        elif "claude" in name or "anthropic" in name:
            provider_class = ClaudeProvider
        else:
            provider_class = AnthropicFormatProvider

        provider = provider_class(
            api_key=config["api_key"],
            base_url=config["base_url"],
            model=config["model"]
        )

        return (provider, config["name"])

    @classmethod
    def get_available_providers(cls) -> dict:
        """获取支持的 AI 服务商列表"""
        return {
            "claude": {"name": "Claude (Anthropic)", "supports_vision": True},
            "openai": {"name": "GPT (OpenAI)", "supports_vision": True},
            "minimax": {"name": "MiniMax", "supports_vision": True},
            "bailian": {"name": "通义千问 (阿里百炼)", "supports_vision": True},
            "deepseek": {"name": "DeepSeek", "supports_vision": True},
        }


def get_available_providers() -> dict:
    return AIFactory.get_available_providers()


def create_dashboard_agent_provider() -> Optional[tuple[AIProvider, str]]:
    """为 Dashboard Agent 创建 AI Provider（使用 app_type='claude'）"""
    return AIFactory.create_provider_from_ccswitch(app_type="claude")
