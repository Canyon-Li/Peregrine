"""模型API Key的安全存储边界。"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Protocol


class ModelSecretStore(Protocol):
    """测试可替换的最小密钥存储接口。"""

    def get(self, provider: str) -> str | None: ...

    def set(self, provider: str, value: str) -> None: ...


class EnvFileSecretStore:
    """API Key 保存到 backend/.env（已被 .gitignore 排除），不进入 JSON 与 git。

    直接解析与写回 .env 文件本身，不经过 pydantic 缓存：保存后未重启的
    进程也能读到已存密钥（保存校验的 existing_keys 依赖这一点）。
    """

    # 与 app.models.config 的 key_variable 一致；qwen 用规范名 DASHSCOPE_API_KEY，
    # pydantic 的 AliasChoices 对 QWEN_API_KEY / DASHSCOPE_API_KEY 均可加载。
    _KEY_VARIABLES = {
        "openai": "OPENAI_API_KEY",
        "qwen": "DASHSCOPE_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
    }

    def __init__(self, path: Path | None = None) -> None:
        self.path = path or Path(__file__).resolve().parents[2] / ".env"

    def get(self, provider: str) -> str | None:
        variable = self._KEY_VARIABLES.get(provider)
        if variable is None:
            return None
        pattern = re.compile(rf"^\s*{re.escape(variable)}=(.*)$")
        for line in self._read_lines():
            match = pattern.match(line)
            if match:
                value = match.group(1).strip()
                if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                    value = value[1:-1].strip()
                return value or None
        return None

    def set(self, provider: str, value: str) -> None:
        variable = self._KEY_VARIABLES.get(provider)
        if variable is None:
            raise ValueError(f"unknown provider: {provider}")
        normalized = value.strip()
        if not normalized:
            raise ValueError("api key cannot be empty")
        pattern = re.compile(rf"^\s*{re.escape(variable)}=")
        lines = [line for line in self._read_lines() if not pattern.match(line)]
        lines.append(f"{variable}={normalized}")
        self._write_lines(lines)

    def _read_lines(self) -> list[str]:
        if not self.path.exists():
            return []
        return self.path.read_text(encoding="utf-8").splitlines()

    def _write_lines(self, lines: list[str]) -> None:
        # ponytail: 无文件锁；单人本机工具，并发保存密钥不是真实场景
        temp = self.path.with_name(f".{self.path.name}.tmp.{os.getpid()}")
        temp.write_text("\n".join(lines) + "\n", encoding="utf-8")
        os.replace(temp, self.path)


__all__ = ["EnvFileSecretStore", "ModelSecretStore"]
