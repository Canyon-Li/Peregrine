"""跨模块共用的文件系统原子写工具。"""

from __future__ import annotations

import os
import secrets
import time
from pathlib import Path

_REPLACE_ATTEMPTS = 8
_REPLACE_BACKOFF_SECONDS = 0.02


def _replace_with_retry(temporary: Path, target: Path) -> None:
    """目标文件被并发句柄占用时短暂退避重试。

    Windows 上若目标正被其他线程读取（默认共享模式不含删除权限），
    ``os.replace`` 会抛 ``PermissionError``；读方都是短事务，重试即可收敛。
    """

    for attempt in range(_REPLACE_ATTEMPTS):
        try:
            os.replace(temporary, target)
            return
        except PermissionError:
            if attempt + 1 == _REPLACE_ATTEMPTS:
                raise
            time.sleep(_REPLACE_BACKOFF_SECONDS)


def _write_atomic(path: Path, payload: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    suffix = f"{os.getpid()}-{secrets.token_hex(4)}"
    temporary = path.with_name(f".{path.name}.tmp-{suffix}")
    try:
        if isinstance(payload, str):
            temporary.write_text(payload, encoding="utf-8")
        else:
            temporary.write_bytes(payload)
        _replace_with_retry(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def write_atomic_text(path: Path, content: str) -> None:
    """原子写 utf-8 文本文件。"""

    _write_atomic(path, content)


def write_atomic_bytes(path: Path, data: bytes) -> None:
    """原子写二进制文件。"""

    _write_atomic(path, data)


__all__ = ["write_atomic_bytes", "write_atomic_text"]
