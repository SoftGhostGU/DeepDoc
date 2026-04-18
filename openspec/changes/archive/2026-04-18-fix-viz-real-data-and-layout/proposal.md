## Why

上一轮 `fix-heatmap-and-flow-ui` 改完后，真机验证发现四处仍未真实可用：

1. **引用 Tab 底部大片空白**：`CitationPanel` 的 `ScrollArea` 硬编码 `h-[420px]`，外层 Card 是 `h-full`，比 420 高的部分就露出 Card 空底色。
2. **导图 Tab 展示 DeepDoc 产品本身的章节**（"第一章 问题定义"等），而不是用户上传文档的结构。原因是 `chat-window.tsx` 在 `document.structureTree` 未加载/缺失时 fallback 到了 `mockDocumentTree`。
3. **路径 Tab 流式结束后只有"用户查询 / 生成回答 / 最终答案"三个节点亮绿**，中间四个阶段全部回退为 inactive。原因是 `getStageStatus` 在 `currentStage===null` 时一律返回 inactive，`hasFinished` 的 completed 处理只覆盖了首尾三个节点。
4. **热力图相关度全 0、"看不懂"**：根因是数据链从未真正把段落+分数送到前端——
   - Prisma `Document` 模型没有 `paragraphs` 字段，`/api/documents` 永远不返回段落数据。
   - 前端 `document-heatmap.tsx` 期待 `paragraph.id` 与 `chunk.id` 对得上，但它们属于不同命名空间。
   - RAG 服务 `streamer.py:_result_to_paragraph` 返回的段落**没有 score**，`index` 还写死为 `0`。
   - 前端又在 dev 模式下 fallback 到 `mockParagraphs`，让问题更不容易被发现。

这四处加起来让用户根本无法信任右侧可视化面板。

## What Changes

- **BREAKING (内部 SSE)**：`retrieval_paragraphs` event 的每个段落 payload 增加 `score: number` 字段，并返回真实 `index`（不再写死 0）。前端 `ParagraphItem` 类型同步补字段。
- 热力图 `DocumentHeatmap` 改为以实时 `retrievedParagraphs`（流式事件里拿到的带分数段落）为主数据源；移除对 `document.paragraphs` 的依赖（当前数据库根本不存）；移除 `mockParagraphs` dev fallback。
- 导图 `DocumentMindmap` 移除 `mockDocumentTree` fallback；真实文档没有 `structureTree` 时显示明确空态（"文档未产出结构树"），而不是混入 DeepDoc 自己的章节。
- 路径图 `getStageStatus` 扩展：`hasFinished=true` 时所有流水线阶段一并显示为 completed；仅当完全未开始（`!isStreaming && !currentStage && !hasFinished`）时才返回 inactive。
- 引用面板 `CitationPanel` 的 `ScrollArea` 从 `h-[420px]` 改为填满 Card 剩余高度（flex 布局 + `min-h-0` + `flex-1`），去掉固定像素带来的空白。

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `retrieval-path-visualization`：规范"中间阶段在流式结束后同样显示为 completed"；SSE paragraphs payload 要求带 score 与真实 index。
- `document-heatmap`：规范数据来源改为实时检索返回的段落 + 其 score；移除 mock fallback；空态文案分离。
- `document-mindmap`：规范必须展示真实文档结构树；无结构树时展示空态而非 mock 产品结构。
- `multi-doc-citations`（或 citations 相关 spec）：规范引用面板滚动区域填满容器，不再留像素级空白。

## Impact

- 代码：
  - `rag-service/app/generation/streamer.py`（`_result_to_paragraph` 增补 score、真实 index）
  - `web-app/types/rag.ts`（`ParagraphItem.score?: number`）
  - `web-app/components/rag/document-heatmap.tsx`（数据源切换、fallback 移除）
  - `web-app/components/rag/document-mindmap.tsx` 或 `chat-window.tsx`（移除 mock tree fallback、加空态）
  - `web-app/components/rag/retrieval-flow.tsx`（状态机扩展）
  - `web-app/components/rag/citation-panel.tsx`（Card/ScrollArea 高度修正）
  - `web-app/components/rag/chat-window.tsx`（移除 `heatmapParagraphs`/`isParagraphDataReady` 相关 mock fallback）
- 数据/DB：无需迁移；保留现有 `Document.structureTree`。**不**新增 `paragraphs` DB 字段，段落始终由 SSE 实时送达。
- 依赖：无新增。
- 回退：纯代码 revert。
- 兼容性：`retrieval_paragraphs` payload 新增字段对老前端是向后兼容的可选字段；新前端若收到无 score 字段的老 payload 时按 0 处理（热力图会显示"未检索"色）。
