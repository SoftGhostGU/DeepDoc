# DeepDoc

面向百页级长文档的可视化层级 RAG 智能问答系统。

## 架构

```
浏览器 ──HTTP/SSE──▶ Next.js (3000) ──HTTP/SSE──▶ Python RAG (8000) ──▶ Qdrant (6333)
```

- **web-app** — Next.js 全栈应用（前端 UI + API 代理 + SQLite 会话存储）
- **rag-service** — Python FastAPI 服务（解析、索引、检索、生成）
- **Qdrant** — 向量数据库

## 快速启动

### 方式一：Docker Compose 全栈启动（推荐）

**前置条件：** Docker Desktop 已安装并运行。

1. 在项目根目录创建 `.env` 文件：

```env
LLM_API_KEY=你的LLM密钥
LLM_BASE_URL=https://api.minimax.chat/v1
LLM_MODEL=MiniMax-Text-01
RAG_SERVICE_URL=http://rag:8000
```

2. 启动所有服务：

```bash
docker compose --profile full up --build
```

3. 访问 http://localhost:3000

| 服务 | 端口 | 说明 |
|------|------|------|
| web | 3000 | Next.js 前端 |
| rag | 8000 | RAG 服务（API 文档: http://localhost:8000/docs） |
| qdrant | 6333 | 向量数据库（Dashboard: http://localhost:6333/dashboard） |

### 方式二：仅前端 Mock 模式

不需要 RAG 服务和 Qdrant，所有问答接口返回模拟数据。适合前端开发和演示。

```bash
cd web-app
pnpm install
pnpm dev
```

访问 http://localhost:3000。当 `RAG_SERVICE_URL` 为空时自动进入 Mock 模式。

也可以用 Docker：

```bash
docker compose up
```

只会启动 web 服务（rag 和 qdrant 在 `full` profile 下，不指定则不启动）。

### 方式三：Qdrant Docker + 本地服务

Qdrant 用 Docker 启动，RAG 服务和 Next.js 在本地运行，方便开发调试。

**1. 启动 Qdrant（Docker）：**

```bash
docker run -d \
  --name deepdoc-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant-storage:/qdrant/storage \
  qdrant/qdrant:v1.15.1
```

> `-v qdrant-storage:/qdrant/storage` 持久化向量数据，容器删除后数据不丢失。

验证 Qdrant 是否正常：访问 http://localhost:6333/dashboard 或执行：

```bash
curl http://localhost:6333/healthz
```

后续启停：

```bash
docker start deepdoc-qdrant   # 启动已有容器
docker stop deepdoc-qdrant    # 停止
docker rm deepdoc-qdrant      # 删除（数据保留在 qdrant-storage 卷中）
```

**2. 启动 RAG 服务（本地）：**

```bash
cd rag-service
cp .env.example .env
```

编辑 `rag-service/.env`，确保以下配置：

```env
QDRANT_HOST=localhost
QDRANT_PORT=6333
LLM_API_KEY=你的LLM密钥
LLM_BASE_URL=https://api.minimax.chat/v1
LLM_MODEL=MiniMax-Text-01
```

然后启动：

```bash
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

验证 RAG 服务是否正常：访问 http://localhost:8000/health

**3. 启动 Next.js（本地）：**

```bash
cd web-app
pnpm install
```

编辑 `web-app/.env.local`，设置：

```env
RAG_SERVICE_URL=http://localhost:8000
```

```bash
pnpm dev
```

访问 http://localhost:3000。

## 使用流程

1. 在文档页上传 PDF / Markdown / TXT 文件
2. 等待解析和索引完成（状态变为「已就绪」）
3. 点击文档进入问答界面
4. 提问，查看带引用溯源的回答和可视化检索路径

## 项目结构

```
DeepDoc/
├── web-app/              # Next.js 全栈应用
│   ├── app/              #   App Router 页面 + API 路由
│   ├── components/       #   UI 组件
│   ├── lib/              #   工具库、Store、Mock
│   └── prisma/           #   SQLite 数据模型
├── rag-service/          # Python RAG 服务
│   └── app/
│       ├── api/          #   FastAPI 路由
│       ├── parsing/      #   文档解析
│       ├── indexing/     #   多粒度索引
│       ├── retrieval/    #   混合检索 + 重排序
│       ├── generation/   #   LLM 生成 + 引用提取
│       ├── rewriting/    #   查询改写 (HyDE / 多查询)
│       └── scoring/      #   可信度评分
└── docker-compose.yml
```

## 环境变量

### RAG 服务 (`rag-service/.env`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LLM_API_KEY` | LLM API 密钥 | （必填） |
| `LLM_BASE_URL` | LLM API 地址 | `https://api.minimax.chat/v1` |
| `LLM_MODEL` | 模型名称 | `MiniMax-Text-01` |
| `QDRANT_HOST` | Qdrant 地址 | `localhost` |
| `QDRANT_PORT` | Qdrant 端口 | `6333` |

### Next.js (`web-app/.env.local`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RAG_SERVICE_URL` | RAG 服务地址，留空则进入 Mock 模式 | （空） |
| `DATABASE_URL` | SQLite 数据库路径 | `file:./dev.db` |
