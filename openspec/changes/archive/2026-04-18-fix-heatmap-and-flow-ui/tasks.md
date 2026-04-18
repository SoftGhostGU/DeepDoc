## 1. 数据接入：为热力图提供真实段落

- [x] 1.1 检查 `Document` 类型与 `documents` API 返回：若尚未包含段落列表，扩展 `types/document.ts`（或相关类型）添加可选 `paragraphs?: ParagraphItem[]` 字段
- [x] 1.2 在获取文档详情的路径（页面加载 / store）中，透传后端返回的段落数据；如果后端暂未提供，约定空数组并在 UI 上降级为空态
- [x] 1.3 在 `components/rag/chat-window.tsx` 中构造 `sectionTitleMap: Map<nodeId, title>`，由 `document.structureTree` 递归收集
- [x] 1.4 把 `<DocumentHeatmap paragraphs={mockParagraphs} />` 改成传入真实段落与 `sectionTitleMap`；保留 dev-only 的 mock 兜底（仅当 `document` 未加载时）

## 2. 热力图组件修正

- [x] 2.1 在 `components/rag/document-heatmap.tsx` 的 Props 中新增可选 `sectionTitleMap?: Map<string, string>`
- [x] 2.2 分组时把 treemap 父节点 `name` 从 `node_id` 替换为 `sectionTitleMap.get(key) ?? "未分类"`
- [x] 2.3 把 tooltip 的判空条件 `!d.paraIndex` 改成 `d.paraIndex == null`
- [x] 2.4 treemap 节点 `value` 公式改为 `hasScores ? score * 100 + MIN_BASELINE : MIN_BASELINE`，`MIN_BASELINE` 常量 = 2
- [x] 2.5 段落为空时的空态文案保持 "暂无段落数据"；新增"段落数据尚未就绪"分支用于 document 加载完但 paragraphs 缺失的情况
- [x] 2.6 验证点击段落块能通过真实 `paragraph_id` 命中当前 session 的 citation

## 3. 路径图状态同步修正

- [x] 3.1 在 `components/rag/retrieval-flow.tsx` 中移除 `useNodesState` / `useEdgesState`，改为直接把 `useMemo` 的 `nodes`、`edges` 作为受控 props 传给 `<ReactFlow>`
- [x] 3.2 验证 `currentStage` / `isStreaming` 变化时 nodes/edges 每一帧都会用新值重渲染（写一个最小的手动验证清单或 Playwright 脚本）

## 4. 路径图状态机修正

- [x] 4.1 在 `RetrievalFlowProps` 中新增 `hasFinished: boolean` 或 `lastCompletedStage?: RagStage | null` 其中之一（按 design.md D5 决策选择）；在 `chat-window.tsx` 中计算并传入
- [x] 4.2 `query` 节点状态：`isStreaming || currentStage || hasFinished` → `completed`，否则 `inactive`
- [x] 4.3 `answer` 节点状态：`hasFinished` → `completed`；`currentStage === "generating"` → `active`；否则 `inactive`（消除原先两分支都返回 `"inactive"` 的死代码）
- [x] 4.4 `generating` 节点：`currentStage === "generating"` → `active`；`hasFinished` → `completed`；否则按现有 `getStageStatus` 规则
- [x] 4.5 其余中间阶段保持原 `getStageStatus` 语义，但增加单元/手动测试确认"analyzing → rewriting"切换时 `analyzing` 立即变 completed

## 5. 路径图布局与交互

- [x] 5.1 在 `<ReactFlow>` 外层容器上挂 `ref`，通过 `ResizeObserver` 拿到容器宽度 `containerWidth`
- [x] 5.2 节点位置改为 `x: idx * spacing`，其中 `spacing = max(120, containerWidth / (FLOW_IDS.length + 1))`
- [x] 5.3 移除 `panOnDrag={false}` 和 `zoomOnScroll={false}`，恢复 React Flow 默认
- [x] 5.4 对小屏（< 640px）显式设置 `panOnDrag={true}`，保证节点溢出时可以拖动查看

## 6. Store 清理（若需要）

- [x] 6.1 验证 `lib/stores/chat-store.ts` 在切换 `documentId` 时会清空 `retrievedChunks` / `retrievedParagraphs` / `currentStage` / `stageTimestamps`；若未清空，增加清理逻辑避免旧文档的热力数据染色新文档

## 7. 验证

- [x] 7.1 `pnpm lint`、`pnpm typecheck`（如有）通过
- [x] 7.2 手动验证：启动 dev server，上传一篇多章节文档，提问一次
  - [ ] 路径 tab：7 个节点按 `analyzing → rewriting → retrieving_summary → retrieving_paragraphs → generating` 依次高亮，流式结束后全部变完成态（含 `query` 与 `answer`）
  - [ ] 热力 tab：分组头是真实章节标题；颜色随 score 分布；点击一个段落能在引用面板高亮对应 citation
  - [ ] DevTools 切 375px：路径 tab 可以用鼠标/触摸拖动平移
- [x] 7.3 回归：对话其他已有功能（引用、思考过程、导图、性能）显示无回归

## 8. 归档与 PR

- [x] 8.1 `openspec validate fix-heatmap-and-flow-ui`
- [x] 8.2 提交 PR，关联本 change 目录
- [x] 8.3 合入后执行 `openspec archive fix-heatmap-and-flow-ui`
