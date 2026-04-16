## 1. 数据模型与 Mock 数据

- [x] 1.1 修改 `prisma/schema.prisma`：在 ChatSession 模型中新增可选 `documentIds` 字段（Json 类型，存储 string[]），运行 Prisma migration
- [x] 1.2 扩展 `types/index.ts`：ChatSession 类型新增 `documentIds?: string[]`，Citation 类型新增 `documentId?: string` 和 `documentName?: string`
- [x] 1.3 扩展 `lib/mock/data.ts`：新增 `mockMultiDocCitations`，包含来自 2-3 份不同文档的引用数据，每条引用带 documentId 和 documentName
- [x] 1.4 扩展 `lib/mock/sse.ts`：新增 `createMockMultiDocChatStream`，生成包含多文档引用的 SSE 流，answer 文本引用来自不同文档的 `[1]` `[2]` `[3]`

## 2. 文档多选交互

- [x] 2.1 创建 `components/rag/multi-doc-selector.tsx`：Dialog 组件，展示已索引文档列表（checkbox + 文档名 + 页数 + 日期），底部显示已选数量和"开始问答"按钮
- [x] 2.2 在文档管理页 header 区域添加"多文档问答"按钮，至少 2 份 INDEXED 文档时可用，点击打开 multi-doc-selector
- [x] 2.3 实现确认跳转逻辑：选择文档后导航到 `/chat/multi?docs=id1,id2,...`

## 3. 多文档 Chat 页面与 Route Handler

- [x] 3.1 创建 `app/(pages)/chat/multi/page.tsx`：多文档 chat 页面，从 URL query 读取 docs 参数，加载文档信息
- [x] 3.2 实现多文档 chat header：显示所有选中文档的名称色标（每份文档一个带颜色的 Badge）
- [x] 3.3 扩展 chat-store：`sendMessage` 支持 `doc_ids` 数组参数，multi-doc session 的创建和管理
- [x] 3.4 修改 `/api/chat/route.ts`：接受 `doc_ids` 数组参数（向后兼容单 `doc_id`），Mock 模式调用 `createMockMultiDocChatStream`，真实模式将 `doc_ids` 转发给 Python

## 4. 跨文档引用展示

- [x] 4.1 修改 `components/rag/citation-marker.tsx`：多文档模式下引用标记旁显示来源文档的颜色圆点
- [x] 4.2 修改 `components/rag/citation-panel.tsx`：多文档模式下按文档分组展示引用（Accordion 折叠），每组 header 显示文档名 + 颜色 + 引用数
- [x] 4.3 修改 `components/rag/citation-summary-footer.tsx`：多文档模式下显示"基于 N 个来源，来自 M 份文档"+ 彩色文档标记
- [x] 4.4 创建文档颜色分配工具函数 `lib/utils/doc-colors.ts`：为每份文档分配一个区分色（从预定义调色板中按索引取色）

## 5. 验证

- [x] 5.1 Mock 模式多文档问答流程验证：文档页 → 点击"多文档问答" → 选择 2+ 文档 → 确认 → 跳转多文档 chat → 提问 → 流式回答带多文档引用 → 引用面板按文档分组
- [x] 5.2 单文档兼容性验证：原有单文档 chat 流程不受影响，`/chat/[documentId]` 路由正常工作
- [x] 5.3 引用展示验证：行内标记带文档颜色 → 点击标记 → 引用面板定位到对应文档分组和引用条目 → footer 显示文档数量
