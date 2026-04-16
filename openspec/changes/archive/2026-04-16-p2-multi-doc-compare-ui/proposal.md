## Why

产品文档 P2-6 要求实现"多文档对比问答 UI"——允许用户选择多份已索引文档，在同一个问答会话中跨文档检索和回答。当前系统仅支持单文档问答，无法对比不同文档中的观点或汇总多源信息。此功能依赖 Python 侧 P2-2（多文档联合检索），前端需提供文档多选、跨文档引用展示和来源区分的交互。

## What Changes

- 新增文档多选交互：在问答入口处支持选择 1~N 份已索引文档进入多文档问答模式
- 新增 `/api/chat/multi` Route Handler：将多个 doc_id 和 query 转发给 Python `/api/ask`（多文档模式）
- 扩展 chat-store：支持 multi-doc session（关联多个 documentId）
- 扩展 Citation 展示：引用标记需显示来源文档名，引用面板按文档分组
- 扩展 Prisma schema：ChatSession 支持关联多个 Document（多对多关系或 JSON 字段）
- 新增 mock 数据：多文档场景的 mock SSE 流，包含来自不同文档的 citations

## Capabilities

### New Capabilities
- `multi-doc-selection`: 文档多选交互——选择器组件、多文档会话创建、多选状态管理
- `multi-doc-chat`: 多文档问答流程——Route Handler、chat-store 扩展、SSE 消费适配
- `multi-doc-citations`: 跨文档引用展示——引用按文档分组、来源文档标签、引用面板多文档视图

### Modified Capabilities

## Impact

- `web-app/lib/stores/chat-store.ts`：session 模型扩展支持多 documentId
- `web-app/app/api/chat/route.ts`：支持 multi-doc 请求参数
- `web-app/components/rag/chat-window.tsx`：多文档模式下的 header 和引用展示
- `web-app/components/rag/citation-panel.tsx`：按文档分组的引用展示
- `web-app/components/rag/citation-marker.tsx`：行内引用标记增加文档来源标识
- `web-app/prisma/schema.prisma`：ChatSession 多文档关联
- `web-app/lib/mock/data.ts` + `sse.ts`：多文档 mock 数据
- 依赖：Python P2-2 多文档联合检索接口（Mock 模式下可独立开发）
