## Why

DeepDoc 项目刚刚启动，`web-app/` 目录仅有 `create-next-app` 生成的默认模板，所有业务文件（组件、API 路由、类型、数据库）均为空壳。成员 A/B 的 Python RAG 服务同样处于零状态。作为成员 C，需要尽快搭建起完整的 Next.js 应用基座——包括项目脚手架、Mock Server、Docker Compose、数据库层和核心页面骨架——使三人能完全并行开发。

## What Changes

- 安装全部前端依赖（shadcn/ui、Zustand、React Flow、ECharts、Prisma 等）
- 配置 Docker Compose（Next.js + Python RAG + Qdrant 三服务编排）
- 建立 SQLite + Prisma 数据模型（文档元数据、会话历史）
- 实现 Mock Server（Next.js Route Handlers 返回符合 OpenAPI 契约的假数据）
- 搭建核心页面布局与路由结构（文档管理页、问答主界面）
- 实现文档上传与管理功能
- 实现问答主界面（含基础流式答案渲染 via SSE）
- 实现 Route Handlers 代理层（SSE 透传，Mock 模式 / 真实 Python 服务可切换）
- 实现引用溯源交互（点击跳转 + 原文高亮）
- 定义前端 TypeScript 类型（基于产品文档中的接口契约）

## Capabilities

### New Capabilities

- `project-scaffold`: 依赖安装、Docker Compose、项目目录结构、环境配置
- `database-layer`: SQLite + Prisma schema（文档元数据、会话历史）
- `mock-server`: Mock Route Handlers，返回符合 OpenAPI 契约的假数据，支持 SSE 流式模拟
- `document-management`: 文档上传、文件列表、文档元数据 CRUD 页面
- `chat-interface`: 问答主界面，流式答案渲染，SSE 消费与展示
- `sse-proxy`: Next.js Route Handlers 代理层，SSE 透传 Python RAG 服务
- `citation-tracing`: 引用溯源交互——点击引用跳转到原文段落、高亮显示

### Modified Capabilities

（无已有能力需要修改——项目从零开始）

## Impact

- **代码**: `web-app/` 目录下所有核心文件将从空壳变为功能骨架
- **依赖**: `package.json` 新增 ~10 个生产/开发依赖
- **基础设施**: 新增 `docker-compose.yml`（项目根目录）
- **数据库**: 新增 `prisma/schema.prisma` 和 SQLite 数据文件
- **API**: 新增 5+ Route Handlers（`/api/upload`, `/api/documents`, `/api/chat`, `/api/compare`, `/api/history`）
- **类型**: `web-app/types/rag.ts` 将定义完整的请求/响应类型
- **团队影响**: A/B 可用 Mock Server 独立测试前端集成；Docker Compose 提供一键启动环境
