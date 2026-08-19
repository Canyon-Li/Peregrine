"""Peregrine Agent Server：把现有 Agent Harness 界面化（FastAPI + WebSocket）。"""

from .app import __version__, create_app
from .events import RpcBroadcastEventHandler, EventBroker

__all__ = [
    "RpcBroadcastEventHandler",
    "EventBroker",
    "__version__",
    "create_app",
]
