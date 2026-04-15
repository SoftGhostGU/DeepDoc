## Why

当前 `nextjs-app-foundation` 已经搭起可运行骨架，但 code review 暴露出几处会直接影响正确性和开发流程的问题：聊天会话可能跨文档串写、真实上传失败后文档会卡在 `PARSING`、引用面板在多轮对话中可能展示错误来源、Docker Compose 也没有真正支持 web-only mock 开发模式。这些问题不解决，后续继续叠加 P1 可视化功能会把错误行为固化下来。

## What Changes

- 增加会话归属校验，确保聊天消息不能写入错误文档的会话。
- 增加上传失败恢复路径，确保真实模式下上游异常时文档状态会落到 `FAILED` 而不是永久卡住。
- 调整引用面板的数据来源，使其跟随当前选中的消息，而不是总是绑定最新一条回答。
- 调整 Docker Compose 开发模式，支持 `web` 单独以 Mock 模式启动，同时保留完整三服务联调方式。
- 补充对应验证，覆盖这些高风险路径。

## Capabilities

### New Capabilities
- `chat-session-integrity`: 约束 chat session 与 document 的归属关系，防止跨文档串写消息。
- `upload-failure-recovery`: 约束上传代理在真实模式失败时的状态回收与错误返回。
- `citation-panel-selection`: 约束引用面板必须跟随当前选中回答显示正确来源。
- `docker-dev-modes`: 约束 Docker Compose 同时支持 web-only mock 开发和全栈联调模式。

### Modified Capabilities

## Impact

- Affected code: `web-app/app/api/chat/route.ts`, `web-app/app/api/upload/route.ts`, `web-app/components/rag/chat-window.tsx`, `web-app/components/rag/chat-message.tsx`, `web-app/lib/stores/chat-store.ts`, `docker-compose.yml`
- Affected behavior: chat persistence correctness, upload status transitions, citation tracing correctness, Docker 开发启动方式
- Verification: 需要补充针对真实上传失败、跨文档 session、引用切换和 compose 启动模式的验证
