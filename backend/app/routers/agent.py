"""
Agent SSE 路由
POST /api/agent/chat - 发送消息，获取 SSE 流
GET /api/agent/status - 检查 cc-switch 状态
"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.agent import agent
from app.ai import CCSwitchConfig

router = APIRouter(prefix="/api/agent", tags=["Agent助手"])


@router.get("/status")
async def get_agent_status():
    """检查 Agent 系统状态"""
    cc_available = CCSwitchConfig.is_available()
    cc_providers = CCSwitchConfig.get_all_providers() if cc_available else []
    current_provider = CCSwitchConfig.get_current_provider()

    return {
        "cc_switch_available": cc_available,
        "current_provider": current_provider.get("name") if current_provider else None,
        "providers": [p.get("name") for p in cc_providers],
    }


@router.post("/chat")
async def chat(request: dict):
    """
    发送消息给 Agent，返回 SSE 流

    请求体：
    {
        "message": "添加一个折线图到左上角",
        "state": {
            "components": [...],
            "layout": [...],
            "theme": "dark"
        }
    }
    """
    message = request.get("message", "")
    state = request.get("state", {})

    if not message:
        raise HTTPException(status_code=400, detail="message 不能为空")

    # 检查 cc-switch 是否可用
    if not CCSwitchConfig.is_available():
        raise HTTPException(
            status_code=500,
            detail="cc-switch 未安装或未配置 AI Provider"
        )

    current_provider = CCSwitchConfig.get_current_provider()
    if not current_provider or not current_provider.get("api_key"):
        raise HTTPException(
            status_code=500,
            detail="未检测到有效的 AI Provider 配置，请在 cc-switch 中配置"
        )

    async def event_generator():
        """生成 SSE 事件流"""
        try:
            async for event in agent.chat(message, state):
                # 将事件转换为 SSE 格式
                yield {
                    "event": event.get("type", "message"),
                    "data": json.dumps(event, ensure_ascii=False),
                }
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "content": str(e)}, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())
