# Peregrine

本地优先的对话式 Agent 工作台。后端是一套完整的 Agent 运行时：工具调用、审批门控、
两层上下文管理与压缩、长期记忆（Core Memory / Memory / INDEX 投影）、技能沉淀与审核、
任务与运行生命周期、定时调度、检查点与交付物、评测框架。前端提供对话、任务可视化与
设置界面，通过 WebSocket RPC 与后端通信。

## 目录结构

- `backend/` — Python Agent 运行时（`app/`）与测试（`tests/`，见
  [backend/tests/README.md](backend/tests/README.md)）
- `web/` — Vite + React + TypeScript 前端

## 快速开始

后端（Python 3.12+）：

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m app.server --provider deepseek
```

服务默认监听 `127.0.0.1:8000`。API Key 放在 `backend/.env`（参考
[backend/.env.example](backend/.env.example)，该文件不入库）；配置了多个 Provider 时必须用
`--provider` 指定一个。`python -m app` 可启动终端 CLI 或完成首次模型设置。

前端（Node 22）：

```bash
cd web
npm install
npm run dev
```

## 测试与检查

```bash
cd backend
.venv\Scripts\pip install -r requirements.txt -r requirements-dev.txt
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check .
.venv\Scripts\python -m compileall -q app tests
```

前端：`npm test`、`npm run typecheck`、`npm run build`。CI 在 ubuntu 上运行以上全部步骤。

## 许可证

[MIT](LICENSE)
