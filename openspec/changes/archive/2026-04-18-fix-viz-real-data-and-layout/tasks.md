## 1. 后端 SSE payload 补齐

- [x] 1.1 检查 `rag-service/app/retrieval/*`，确认 `RetrievalResult` 已有 `score`，并补齐可用的段落级 `index` 来源
- [x] 1.2 修改 `rag-service/app/generation/streamer.py::_result_to_paragraph`：返回 `score`（`round(r.score, 4)`）与真实 `index`（无文档级 index 时回退为结果序号）
- [x] 1.3 在 rag-service 增加最小单测，验证 `retrieval_paragraphs` 的 paragraph 对象含 `score` 与有效 `index`

## 2. 前端类型与数据通路

- [x] 2.1 在 `web-app/types/rag.ts` 为 `ParagraphItem` 增加可选字段 `score?: number`
- [x] 2.2 检查 chat-store 对 `retrieval_paragraphs` 的解析路径，确认新字段透传到 `retrievedParagraphs`

## 3. 热力图改为真实检索数据

- [x] 3.1 `document-heatmap.tsx` Props 改为接收 `retrievedParagraphs: ParagraphItem[]`，移除 `isParagraphDataReady`
- [x] 3.2 组件内部评分来源改为 `para.score ?? 0`，不再使用 `scoreMap.get(para.id)`
- [x] 3.3 空态逻辑收敛：无数据时显示引导文案，有数据时绘制 treemap
- [x] 3.4 移除 `document-heatmap.tsx` 对 `retrievedChunks` 的依赖
- [x] 3.5 `chat-window.tsx` 删除 `heatmapParagraphs` / `isParagraphDataReady` useMemo，`DocumentHeatmap` 传入 `retrievedParagraphs` 与 `sectionTitleMap`
- [x] 3.6 删除 `chat-window.tsx` 中对 `mockParagraphs` 的引用

## 4. 导图去除 mock 兜底

- [x] 4.1 `chat-window.tsx` 将 mindmap `tree` 传参改为 `tree={(document?.structureTree ?? null) as DocumentTreeNode | null}`
- [x] 4.2 `document-mindmap.tsx` 在 `tree === null` 时渲染空态“该文档未产出结构树”
- [x] 4.3 删除 `chat-window.tsx` 对 `mockDocumentTree` 的引用

## 5. 检索路径状态机修复

- [x] 5.1 `retrieval-flow.tsx` 的 `getStageStatus` 增加 `hasFinished` 参数，`hasFinished=true` 时统一返回 `completed`
- [x] 5.2 调用点改为传入 `hasFinished`
- [x] 5.3 移除 `generating` 节点的特殊 completed 分支，统一交给 `getStageStatus`
- [x] 5.4 保留 `query`、`answer` 的特殊判定
- [x] 5.5 验证错误/中断场景下 `hasFinished=false` 时不会误把未到达阶段标记为 completed

## 6. 引用面板布局修复

- [x] 6.1 `citation-panel.tsx`：`Card` 使用 `flex h-full flex-col`
- [x] 6.2 `CardContent` 使用 `flex-1 min-h-0 p-0`
- [x] 6.3 `ScrollArea` 改为 `h-full px-4 pb-4`，移除 `h-[420px]`
- [x] 6.4 `chat-window.tsx` 的 citations tab 改为 `flex flex-col`，并让 CitationPanel `flex-1 min-h-0`、context section `shrink-0`

## 7. Mock 依赖清理与文档

- [x] 7.1 grep 全仓确认 `mockParagraphs` / `mockDocumentTree` 不再被 chat/viz 组件引用（仅 mock 数据与 SSE 模拟链路保留）
- [x] 7.2 在 `web-app/AGENTS.md` 增补规则：“viz 组件禁止 fallback 到 `lib/mock` 常量，mock 仅用于 SSE 模拟器或 e2e mock 环境”

## 8. 验证

- [x] 8.1 `pnpm lint` 与 `pnpm exec tsc --noEmit` 通过
- [x] 8.2 rag-service 跑 `pytest`，确认含 `score` + 有效 `index` 的 payload 单测通过
- [ ] 8.3 手动端到端回归（上传真实 PDF / 导图 / 路径 / 热力图 / 引用 tab）
- [ ] 8.4 手动回归思考、性能 tab 与既有功能

## 9. 归档与 PR

- [x] 9.1 `openspec validate fix-viz-real-data-and-layout`
- [ ] 9.2 提交 PR，关联本 change 目录
- [ ] 9.3 合入后 `openspec archive fix-viz-real-data-and-layout`
