## Context

右侧可视化 Tab（路径/热力）在当前实现中存在多处与规范相悖的 bug 与交互缺陷：

- `components/rag/document-heatmap.tsx` 由 `components/rag/chat-window.tsx:405` 传入的 `paragraphs={mockParagraphs}` 始终是写死常量，不跟随当前 `document` 切换，也无法与后端返回的检索 chunk 的 `paragraph_id` 对齐。
- `components/rag/retrieval-flow.tsx` 使用 `useNodesState(rawNodes)` / `useEdgesState(rawEdges)` 时，只把 `rawNodes` 当作初始值，useMemo 重算后 React Flow 内部状态并不同步——节点颜色、边动画在流式过程中不会更新。
- 路径图中"answer"节点的三元运算符两分支同时返回 `"inactive"`（死代码），`generating` 是最后一个阶段因此永远不会满足 `stageIdx < currentIdx`，"query"在 `isStreaming` 结束后立刻回退为 inactive。
- 热力图 tooltip 判断使用 `!d.paraIndex`，index 为 0 时会误判；treemap 中相关度 0 的段落 `value=0` 会完全消失。
- 路径图 `panOnDrag={false}` 且节点位置为 `x: idx * 160` 固定像素，在窄屏下节点溢出且用户无法平移。

本次设计要在不改后端 API 的前提下，修复这些缺陷并把两个组件变为真正"实时、准确、可读"的可视化。

## Goals / Non-Goals

**Goals:**
- 热力图使用当前文档真实段落数据；章节标题展示为真实 title；零分段落仍可见但视觉弱化；tooltip 判空正确。
- 路径图节点/边状态随 `currentStage`、`isStreaming` 实时更新；`query`、`answer`、`generating` 在流式开始/进行/结束时展示正确的 `inactive/active/completed` 状态。
- 路径图支持响应式布局与小屏平移/缩放。
- 所有改动仅限前端 React 组件与其类型；最大化复用现有 `types/rag.ts`、`useChatStore`、`Document.structureTree`。

**Non-Goals:**
- 不重构 SSE 协议或 store 的 stage 状态机。
- 不替换 React Flow / ECharts 渲染库。
- 不新增后端接口（段落数据来自已有 parse 结果或 `structureTree`）。
- 不做国际化、深色/浅色主题切换之类的增量。

## Decisions

### D1. 热力图段落数据来源
- **决策**：从当前 `Document` 读取真实段落。优先从 `document.paragraphs`（若存在）读取；否则从 `document.structureTree` 的叶子节点拉平成 `ParagraphItem[]`。Document 类型中若无段落字段，扩展 `Document` 类型并在 `documents` API 返回中带出（或在获取文档详情时带出）。
- **原因**：当前 `chat-window.tsx` 里 `mockParagraphs` 来自 `@/lib/mock/data`，与检索返回的 `paragraph_id` 不在同一命名空间，导致点击无反应、颜色无法匹配。
- **替代**：曾考虑保留 mock 兜底；拒绝的原因是"兜底"会让真实产品长期跑在假数据上，且让 bug 隐蔽。保留兜底仅限开发模式下 document 尚未加载时。

### D2. 章节标题映射
- **决策**：在 `chat-window.tsx` 构造 `sectionTitleMap: Map<nodeId, title>`，由 `document.structureTree` 递归收集；`DocumentHeatmap` 新增可选 prop `sectionTitleMap`，分组时用 title 替换 `node_id` 作为 treemap 父节点 name。
- **替代**：在 `ParagraphItem` 中直接冗余 `section_title`。拒绝理由：改动数据结构范围大，不如在展示层映射。

### D3. 零相关度段落最小展示值
- **决策**：treemap 的 `value` 公式改为 `hasScores ? (score * 100) + MIN_BASELINE : MIN_BASELINE`，`MIN_BASELINE = 2`。零分段落仍占面积但颜色保持 `#27272a` 灰。
- **替代**：在 `children` 中直接过滤零分段落。拒绝理由：用户需要看到"没被检索到"也是一种信息，热力图不该隐藏它。

### D4. React Flow 状态同步
- **决策**：`retrieval-flow.tsx` 改用受控模式——不再用 `useNodesState` / `useEdgesState`，直接把 `useMemo` 出来的 `nodes` 和 `edges` 传给 `<ReactFlow nodes={} edges={}>`；若需要手动编辑交互（拖动），用 `useEffect` 在 `rawNodes` 变化时 `setNodes(rawNodes)` 同步。
- **原因**：本组件是"只读"可视化，用户不会拖拽节点，没必要维护 React Flow 内部可编辑状态。把 `rawNodes` 作为每次渲染的真值，彻底避免初始化一次后再不更新。
- **替代**：保留 hook 并加 `useEffect` 做同步。拒绝理由：两套状态源同步复杂、容易漏。

### D5. 状态机修正
- **决策**：
  - 增加 `hasFinished` 布尔：`!isStreaming && currentStage === null && (messages 里存在以 assistant 结尾的一条)`；`chat-window` 通过 props 传下来。更轻量做法：`retrieval-flow` 再增加 prop `lastCompletedStage?: RagStage | null` 来表达"最后完成阶段"。
  - 状态推导规则：
    - `query`：`isStreaming || currentStage || hasFinished` → `completed`，否则 `inactive`。
    - 中间阶段（analyzing / rewriting / retrieving_summary / retrieving_paragraphs）：仍按 `currentStage` 与 `STAGE_ORDER` 相对位置。
    - `generating`：当 `currentStage === "generating"` → `active`；当 `hasFinished` → `completed`；否则 `inactive`。
    - `answer`：当 `hasFinished` → `completed`；当 `currentStage === "generating"` → `active`；否则 `inactive`。
- **原因**：修正死代码、首尾节点回退、最后阶段永不 completed 三个 bug。
- **替代**：引入完整状态机库（xstate）。拒绝理由：过度设计。

### D6. 响应式布局
- **决策**：
  - 节点位置仍以索引排布，但横坐标改为 `idx * NODE_SPACING`，`NODE_SPACING` 依据容器宽度动态计算（`containerWidth / (FLOW_IDS.length + 1)`）；用 `useResizeObserver` 或 `ref` + `ResizeObserver` 监听外层 div。
  - `fitView` 保留；`panOnDrag`、`zoomOnScroll` 去掉显式 `false`，恢复默认允许。
  - 小屏下（< 640px）强制 `panOnDrag={true}`，节点间距维持最小可读值 120px。
- **替代**：改成纵向布局。拒绝理由：当前 tab 空间宽度大于高度，横向更自然。

### D7. Tooltip 判空
- **决策**：`!d.paraIndex` → `d.paraIndex == null`。
- 原因：`paraIndex=0` 也是合法段落索引。

## Risks / Trade-offs

- **风险 1**：`document.structureTree` 可能不含 paragraphs——叶子节点只到 section 级。
  - 缓解：后端在 parse 阶段产出的 `ParagraphItem` 列表需要在文档详情接口中透出（或通过单独的 `/api/documents/:id/paragraphs` 端点）。若当前版本 API 没有，则在本次改动中标注"后端支持后再接入"并保留 document.paragraphs 为可选，在无段落时降级为空态 + 提示"段落数据尚未就绪"。
- **风险 2**：切换文档瞬间旧文档的 retrievedChunks 仍在 store 中。
  - 缓解：切换文档时应在 `useChatStore` 中清空 retrieval 状态（验证现有逻辑是否已做；如未，追加一个最小修正）。
- **权衡**：受控模式下 React Flow 失去内部拖拽状态缓存，每次 currentStage 变化都会重建 `nodes/edges`。对 7 个节点的可视化没有性能压力。

## Migration Plan

- 纯前端改动，直接随产品发布即可。
- 无需 schema 迁移。
- 回滚：代码 revert。
- 验证：
  - 手动：开发环境中打开 `/chat/:documentId`，提问一次，观察路径 tab 所有 7 个节点依次高亮并在完成后呈绿色；观察热力 tab 分组名是章节 title、点击命中引用。
  - 窄屏：DevTools 切到 375px，确认路径 tab 可以拖拽平移。

## Open Questions

- 段落数据是通过扩展 `Document` 类型带出，还是新增 `/api/documents/:id/paragraphs` 端点？（倾向前者，因为段落随文档稳定，不需要独立接口）
- 是否需要在路径图中把 `retrieving_summary`/`retrieving_paragraphs` 节点展开为可点开的片段列表？规范 `Chunk display on retrieval nodes` 已有这一要求，但当前实现只展示数量——是否纳入本次改动？**暂不纳入**，留作后续 change。
