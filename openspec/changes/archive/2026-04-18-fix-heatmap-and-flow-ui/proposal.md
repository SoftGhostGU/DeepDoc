## Why

对话页右侧的「路径」和「热力」两个 Tab 在实际使用中并未达到它们在规范（`document-heatmap`、`retrieval-path-visualization`）中承诺的行为：热力图始终展示写死的 mock 段落而不是当前文档的真实段落；检索路径图的节点状态在流式过程中不会更新，"answer"、"generating"、"query" 三个节点的完成态存在逻辑死代码或回退。这些问题让用户无法通过这两个可视化真实了解系统正在做什么，削弱了产品"可解释性"的核心卖点。

## What Changes

- 热力图改用当前文档的真实段落数据，不再依赖 `mockParagraphs` 常量。
- 修复 `retrieval-flow.tsx` 中 React Flow 节点/边不会随 `currentStage`、`isStreaming` 更新的状态同步 bug。
- 修复"answer"节点状态判断为死代码（两分支都返回 `"inactive"`）的逻辑错误。
- 修复流式结束后"query"节点从 completed 回退为 inactive 的问题。
- 修复最后阶段 `generating` 因 `stageIdx < currentIdx` 条件永不成立而无法显示为 completed 的问题。
- 热力图章节分组展示真实章节标题，而不是 `node_id`（如 `sec-1-1`）。
- 热力图中相关度为 0 的段落使用最小基线值，避免 treemap 中方块消失。
- 热力图 tooltip 中 `paraIndex` 的判空使用 `== null` 而不是 `!paraIndex`，避免 index=0 被误判。
- 路径图允许小屏下平移/缩放，去除 `panOnDrag={false}`、`zoomOnScroll={false}` 的硬限制。
- 路径图节点布局改为响应式（依据容器宽度或 `fitView` 自动分布），不再使用 `x: idx * 160` 的固定像素位置。

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `document-heatmap`: 明确要求使用真实文档段落数据与真实章节标题；规范零分段落的最小展示；修正 tooltip 判空规则。
- `retrieval-path-visualization`: 明确要求节点状态随 SSE 事件实时更新；明确"query"、"answer"、`generating` 三个阶段在流式开始、进行中、结束后的显示状态；要求支持响应式布局与小屏平移/缩放。

## Impact

- 代码：
  - `web-app/components/rag/document-heatmap.tsx`
  - `web-app/components/rag/retrieval-flow.tsx`
  - `web-app/components/rag/chat-window.tsx`（传入真实段落数据）
- 数据/类型：
  - 可能需要扩展 `Document` 类型或新增一个提供段落列表与章节标题映射的接口（已存在的 `structureTree` 可提供 title 映射）。
- 依赖：无新增依赖（`@xyflow/react`、`echarts-for-react` 已在用）。
- 后端：不改。
- 风险：热力图数据切换可能导致旧 session 的引用匹配失效——需验证 `paragraph_id` 在真实数据中的一致性。
