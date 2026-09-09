"""Shell cancel：Run 被取消时终止整个进程组，无残留子进程。

覆盖：
- ShellCommandTool.execute 收到 asyncio.CancelledError 时终止进程组并重抛；
- 经 RunManager 取消一个正在执行 shell 工具的 Run 后，无残留进程。

使用真实本地子进程，不调用模型 API。
"""

from __future__ import annotations

import asyncio
import sys
from collections.abc import Sequence
from pathlib import Path

import pytest
from pydantic import SecretStr

from app.agent.runtime import AgentRuntime
from app.checkpoint import SQLiteCheckpointStore
from app.models.adapter import ModelAdapter
from app.models.config import ModelSettings, ProviderConfig
from app.models.registry import ModelAdapterRegistry
from app.models.types import (
    ApiStyle,
    Message,
    MessageRole,
    ModelRequest,
    ModelResponse,
    ModelUsage,
    ToolCall,
)
from app.run import RunManager, RunStatus, SQLiteRunStore
from app.tools.approval import AutoApproveGate
from app.tools.builtin.shell import ShellCommandTool
from app.tools.registry import ToolRegistry


class _FakeModelAdapter(ModelAdapter):
    def __init__(
        self,
        config: ProviderConfig,
        responses: Sequence[ModelResponse | Exception],
    ) -> None:
        super().__init__(config)
        self.responses = list(responses)
        self.requests: list[ModelRequest] = []

    async def complete(self, request: ModelRequest) -> ModelResponse:
        self.requests.append(request)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    async def close(self) -> None:
        pass


def model_response(
    *,
    content: str | None = None,
    tool_calls: tuple[ToolCall, ...] = (),
    usage: ModelUsage | None = None,
) -> ModelResponse:
    return ModelResponse(
        id="fake-response",
        provider="fake",
        model="fake-model",
        message=Message(
            role=MessageRole.ASSISTANT,
            content=content,
            tool_calls=tool_calls,
        ),
        usage=usage or ModelUsage(),
    )


def fake_registry(
    responses: Sequence[ModelResponse | Exception],
) -> tuple[ModelAdapterRegistry, _FakeModelAdapter]:
    config = ProviderConfig(
        provider="fake",
        model="fake-model",
        api_key=SecretStr("offline-test-key"),
        api_style=ApiStyle.CHAT_COMPLETIONS,
    )
    adapter = _FakeModelAdapter(config, responses)
    registry = ModelAdapterRegistry(ModelSettings(_env_file=None))
    registry.register("fake", lambda _: adapter, config=config)
    return registry, adapter


_SLEEP_TAG = "long-sleep-probe"


def _sleep_command() -> str:
    """写标记后长眠的命令；cmd 与 POSIX shell 都能执行。"""
    code = (
        f"import pathlib,time; pathlib.Path('{_SLEEP_TAG}').write_text('x'); "
        "time.sleep(300)"
    )
    return f'"{sys.executable}" -c "{code}"'


async def _process_matches(tag: str) -> bool:
    """是否存在命令行含 tag 的进程（用于验证无残留）。"""

    if sys.platform == "win32":
        query = (
            "@(Get-CimInstance Win32_Process | Where-Object "
            f"{{ $_.CommandLine -like '*{tag}*' -and $_.ProcessId -ne $PID }}"
            ").Count -gt 0"
        )
        process = await asyncio.create_subprocess_exec(
            "powershell",
            "-NoProfile",
            "-Command",
            query,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, _ = await process.communicate()
        return stdout_bytes.strip() == b"True"
    process = await asyncio.create_subprocess_exec(
        "pgrep",
        "-f",
        tag,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    )
    stdout_bytes, _ = await process.communicate()
    return bool(stdout_bytes.strip())


# ---------------------------------------------------------------------------
# 单元：ShellCommandTool 被 cancel 时清理进程组
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_shell_tool_cancel_terminates_process_group(tmp_path: Path) -> None:
    marker = tmp_path / _SLEEP_TAG
    tool = ShellCommandTool(workspace_root=tmp_path)
    task = asyncio.create_task(
        tool.execute(
            {
                "command": _sleep_command(),
                "timeout_seconds": 300,
            }
        )
    )

    # 等子进程真正启动（写 marker 后进入 sleep）；冷启动时解释器启动较慢。
    for _ in range(200):
        if marker.exists():
            break
        await asyncio.sleep(0.05)
    assert marker.exists(), "shell 子进程未启动"

    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    # 进程组应已被终止，无残留 sleep 进程。
    await asyncio.sleep(0.2)
    assert await _process_matches(_SLEEP_TAG) is False


# ---------------------------------------------------------------------------
# 集成：经 RunManager 取消正在执行 shell 工具的 Run
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_runmanager_cancel_shell_run_leaves_no_process(
    tmp_path: Path,
) -> None:
    marker = tmp_path / _SLEEP_TAG
    command = _sleep_command()
    call = ToolCall(
        id="shell-1",
        name="run_shell_command",
        arguments={"command": command, "timeout_seconds": 300},
    )
    registry, _ = fake_registry(
        [
            model_response(tool_calls=(call,)),
            model_response(content="完成"),
        ]
    )
    tools = ToolRegistry()
    tools.register(ShellCommandTool(workspace_root=tmp_path))

    database = tmp_path / "peregrine.db"
    run_store = SQLiteRunStore(database)
    checkpoint_store = SQLiteCheckpointStore(database)
    await run_store.initialize()
    await checkpoint_store.initialize()
    runtime = AgentRuntime(
        registry,
        tools,
        provider="fake",
        checkpoint_store=checkpoint_store,
        approval_gate=AutoApproveGate(),
    )
    manager = RunManager(run_store, checkpoint_store, runtime)

    run_id, _ = await manager.start("跑一个长命令", conversation_id="conv-1")
    for _ in range(200):
        if marker.exists():
            break
        await asyncio.sleep(0.05)
    assert marker.exists(), "shell 子进程未启动"

    cancelled = await manager.cancel(run_id)
    assert cancelled.status is RunStatus.CANCELLED
    # checkpoint 保留执行边界（未决工具语义）。
    checkpoint = await checkpoint_store.get(run_id)
    assert checkpoint is not None
    assert checkpoint.status.value == "interrupted"

    await asyncio.sleep(0.2)
    assert await _process_matches(_SLEEP_TAG) is False
