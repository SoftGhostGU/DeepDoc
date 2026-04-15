## Context

DeepDoc 是一个三人团队开发的面向长文档的可视化层级 RAG 系统。当前 `web-app/` 仅有 Next.js 16 canary 的默认模板，所有业务文件为空。Python RAG 服务 (`rag-service/`) 同样仅有目录骨架。

成员 C（本方）负责 Next.js 全栈应用，需要在 A/B 尚未产出可用 RAG 接口之前，通过 Mock Server 实现完全独立开发。

技术栈约束来自产品文档：Next.js 14+ (App Router)、TypeScript、TailwindCSS + shadcn/ui、Zustand、React Flow、ECharts、Prisma + SQLite、SSE 流式通信。

注意：当前 `package.json` 使用 Next.js 16 canary，比文档中的 14+ 更新。保留此版本，按 App Router 模式开发。

## Goals / Non-Goals

**Goals:**

- 建立可一键启动的完整开发环境（Docker Compose 编排三服务）
- 安装并配置所有前端依赖，使后续 P1 可视化工作无需再折腾依赖
- 实现完整的 Mock Server，让 A/B 的 RAG 服务即使未就绪也不阻塞前端开发
- 完成 P0 全部 Next.js 侧功能的可交互骨架（上传、问答、引用溯源）
- 建立 Prisma 数据模型，持久化文档元数据和会话历史
- 定义与 Python RAG 服务对齐的 TypeScript 类型

**Non-Goals:**

- P1 可视化功能（思维导图、React Flow 动画、热力图、对比分屏）——依赖先装好但不实现
- 用户认证系统（P3 优先级，本阶段不做）
- 真实 RAG 服务集成（Mock 模式优先，联调阶段再切换）
- 移动端适配
- 多文档联合检索 UI

## Decisions

### 1. 状态管理：Zustand

**选择**: Zustand
**替代方案**: React Context / Redux / Jotai
**理由**: 产品文档已指定 Zustand 或 React Context。Zustand 比 Context 更适合跨组件共享状态（如当前文档、会话列表、流式答案状态），且 API 极简、无 Provider 嵌套。Redux 过重，Jotai 原子化模型在此场景无优势。

### 2. UI 组件库：shadcn/ui

**选择**: shadcn/ui（基于 Radix UI + Tailwind）
**替代方案**: Ant Design / Material UI / Headless UI
**理由**: 产品文档指定。shadcn/ui 是 copy-paste 模式，不增加运行时依赖包体积，与 Tailwind 深度集成，组件可完全定制。

### 3. 数据库：SQLite + Prisma

**选择**: SQLite 通过 Prisma ORM 访问
**替代方案**: PostgreSQL / JSON 文件
**理由**: 产品文档指定。SQLite 零配置、单文件部署，足以应对课程项目的数据量。Prisma 提供类型安全的查询和自动迁移。

数据模型核心实体：
```
Document (id, filename, originalName, size, mimeType, status, structureTree, createdAt)
    │
    └─── ChatSession (id, documentId, title, createdAt)
              │
              └─── ChatMessage (id, sessionId, role, content, citations, metadata, createdAt)
```

### 4. Mock Server 策略：Route Handler 内置切换

**选择**: 在 Next.js Route Handlers 中通过环境变量 `RAG_SERVICE_URL` 切换 Mock/真实模式
**替代方案**: 独立 Mock 服务器 / MSW (Mock Service Worker)
**理由**: 
- Mock 逻辑直接写在 Route Handler 中，当 `RAG_SERVICE_URL` 未设置或为空时返回假数据
- 联调时只需设置环境变量指向 Python 服务，无需改代码
- SSE Mock 也在 Route Handler 中实现，模拟分阶段事件流
- 不引入额外工具链，A/B 理解成本最低

### 5. SSE 透传架构

**选择**: Next.js Route Handler 作为 SSE 代理，`ReadableStream` 转发
**理由**:
```
浏览器 ←──SSE──→ Next.js Route Handler ←──SSE──→ Python FastAPI
                   (代理/Mock 切换)
```
- 前端只与 Next.js 通信，不直接访问 Python 服务
- Route Handler 中用 `fetch` + `ReadableStream` 实现 SSE 透传
- Mock 模式下用 `ReadableStream` + `TextEncoder` 模拟延迟事件流

### 6. 文件上传流程

**选择**: Next.js 接收 → 本地存储 → 转发 Python 服务解析
**理由**: 
- 文件先存本地（`public/uploads/` 或专用目录），元数据写入 SQLite
- 同时将文件流式转发给 Python `/api/documents/parse`
- 前端可立即显示文件信息，不必等解析完成
- 后续解析结果通过轮询或回调更新文档状态

### 7. Docker Compose 编排

三服务 + Qdrant：
```yaml
services:
  web:        # Next.js (port 3000)
  rag:        # Python FastAPI (port 8000)
  qdrant:     # 向量数据库 (port 6333)
```
- `web` 通过 `RAG_SERVICE_URL=http://rag:8000` 访问 Python 服务
- 开发阶段可只起 `web`（Mock 模式）或全部起

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Next.js 16 canary 可能有 breaking changes | AGENTS.md 已提醒查阅 `node_modules/next/dist/docs/`；遇到问题降级到稳定版 |
| Mock 数据与真实 RAG 输出结构不一致 | Mock 数据严格按产品文档中的接口契约构造；联调时尽早对齐 |
| SSE 透传在 Next.js App Router 中的兼容性 | 验证 Route Handler 中 `ReadableStream` 的 SSE 行为；必要时用 Pages Router 的 API Routes 作为降级方案 |
| shadcn/ui 初始化可能与 Next.js 16 canary 有兼容性问题 | 如遇问题，手动复制组件代码而非依赖 CLI |
| SQLite 在 Docker 容器中的持久化 | 使用 volume 挂载 SQLite 文件到宿主机 |
| 文件上传大小限制 | Next.js Route Handler 默认 body 限制 4MB，需在 `next.config.ts` 中配置或使用流式上传 |
