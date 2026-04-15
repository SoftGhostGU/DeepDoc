## Context

`nextjs-app-foundation` 已经把 DeepDoc 的 Next.js 基座搭起来了，但当前实现里有几处跨模块的正确性问题：API 层允许客户端复用不属于当前文档的 `session_id`，上传代理在真实模式失败时没有完整回收状态，聊天页的引用面板只跟踪“最新一条有引用的回答”，Docker Compose 也没有把 mock-only 开发模式和全栈联调模式清晰分开。这几个问题横跨 Route Handlers、Zustand store、聊天 UI 和本地开发基础设施，适合先做一次集中收敛，再继续叠加 P1 可视化功能。

## Goals / Non-Goals

**Goals:**
- 收紧 chat session 与 document 的服务端约束，避免跨文档串写消息。
- 在真实上传失败时保证 `Document.status` 能稳定收敛到 `FAILED`，不遗留脏状态。
- 让引用面板与当前用户选中的 assistant 消息绑定，保证多轮对话下来源展示正确。
- 把 Docker Compose 拆成明确的 mock-only 与 full-stack 两种开发路径，并让 spec 中的 `docker compose up web` 语义成立。
- 补充必要验证，确保这些约束后续不再回退。

**Non-Goals:**
- 不重做聊天/上传整体架构。
- 不引入新的持久化模型或认证逻辑。
- 不实现 P1 可视化功能本身。
- 不修改 Python RAG 服务的业务语义，只补最小兼容和 compose 启动方式。

## Decisions

### 1. 服务端以 session 的 `documentId` 为真值

对 `/api/chat`，客户端传入的 `session_id` 只能作为“希望继续哪个会话”的提示，不能直接信任。服务端需要在 `ensureSession` 阶段校验：
- 若 session 不存在，则为当前 `doc_id` 新建。
- 若 session 存在但 `documentId !== doc_id`，直接返回 400，而不是继续写入消息。

这样可以把一致性校验固定在单一边界层，避免把约束分散到 Zustand 或页面路由中。

### 2. 上传失败采用“落库后补偿”而不是“最后统一兜底”

上传代理当前是先写本地文件和 Document 记录，再转发给 RAG 服务。这个流程保留，因为它符合现有页面和数据模型；但要把所有失败分支都收敛到统一补偿逻辑：只要 Document 已经创建，后续任何真实模式异常都必须把状态改成 `FAILED`，并尽量附带可诊断的错误信息。

相比改成事务式外部调用，这种方案更小、更符合当前架构，也能直接解决“永久卡在 `PARSING`”的问题。

### 3. 引用面板基于“选中消息”派生，而不是“最新消息”派生

当前聊天页通过扫描最新一条带 citations 的 assistant 消息来构造侧边栏，这会让旧消息的引用点开后仍然显示最新来源。改为：
- 在聊天页维护 `selectedMessageId`
- 点击某条消息里的 citation 时，同时记录对应消息 ID
- 侧边栏从该消息的 citations 派生内容

这样引用 UI 的数据流与交互源一致，也不需要改动持久化结构。

### 4. Compose 用 profile / service design 表达两种开发模式

目标是让以下两条路径都清晰成立：
- `docker compose up web`：只启动前端，`RAG_SERVICE_URL` 为空，进入 mock mode
- `docker compose --profile full up`：启动 web + rag + qdrant 做联调

为此，`web` 默认不再依赖 `rag` / `qdrant`，并把真实服务地址放到 full-stack 场景下再注入。相比继续硬编码 `depends_on + RAG_SERVICE_URL`，这种方式更符合当前 spec，也更方便团队按需启动。

## Risks / Trade-offs

- [更严格的 session 校验会暴露现有客户端状态问题] -> 返回明确 400 并在前端将其视为会话失效，必要时自动创建新会话。
- [上传失败补偿增加一些分支复杂度] -> 统一抽成最小的状态回收路径，只在已创建 Document 时执行。
- [引用面板改为按选中消息驱动后，需要处理未选中默认态] -> 默认选最近一条 assistant 消息，只有用户点击旧消息时才切换。
- [Compose 拆分开发模式后，命令会比现在多一个 profile 概念] -> 在文档与 tasks 中把 mock-only 和 full-stack 命令写清楚，减少歧义。

## Migration Plan

1. 先调整服务端 chat / upload 逻辑，保证数据一致性。
2. 再调整聊天页引用面板选择模型，避免 UI 行为继续误导调试。
3. 最后调整 `docker-compose.yml` 和验证命令，确认 mock-only 与 full-stack 路径都成立。
4. 使用现有 lint/build/mock-flow 验证，再增加针对这次修复点的手工或脚本验证。

## Open Questions

- 是否要把上传失败的错误详情持久化到 `Document` 模型中，还是仅记录在接口响应里？本次先不扩表，保持最小改动。
- Docker Compose 的 full-stack 模式最终是否需要额外的 `web-full` 服务或 override 文件？本次优先用单文件 profile 保持简单。
