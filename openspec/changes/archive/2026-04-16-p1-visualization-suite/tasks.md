## 1. Store 扩展 & Mock 数据增强

- [x] 1.1 扩展 chat-store：新增 `stageTimestamps` (Record<RagStage, {start, end}>)、`retrievedChunks` (RetrievedChunk[])、`retrievedParagraphs` (ParagraphItem[]) 字段；在 SSE onEvent 中记录时间戳并存储中间检索结果
- [x] 1.2 创建 compare-store (`lib/stores/compare-store.ts`)：管理双轨 SSE 状态（naiveAnswer, hierarchicalAnswer, naiveCitations, hierarchicalCitations, naiveStreaming, hierarchicalStreaming, 各轨 stage/error）
- [x] 1.3 扩充 mock 数据 (`lib/mock/data.ts`)：文档树扩展到 10+ 章节 / 30+ 段落 / 5+ citations，增加各段落到不同 section 的映射关系

## 2. 共享 React Flow 节点样式

- [x] 2.1 创建 `components/rag/flow-nodes.tsx`：定义共享的 React Flow 自定义节点类型（SectionNode 用于思维导图、StageNode 用于检索路径），统一颜色/字体/边框风格

## 3. 流式思考过程 UI (P1-5)

- [x] 3.1 创建 `components/rag/thought-timeline.tsx`：垂直时间轴组件，接收 stageTimestamps + currentStage，渲染 5 个阶段节点（图标+名称+状态+耗时）
- [x] 3.2 实现阶段节点的 pending/active/completed 三态样式及切换动画（spinner、checkmark、颜色变化）
- [x] 3.3 实现 active 阶段的实时计时器（每 100ms 更新显示）
- [x] 3.4 实现已完成阶段的点击展开功能：retrieval_summary 展示 chunks 列表、retrieving_paragraphs 展示段落列表
- [x] 3.5 将 thought-timeline 集成到 chat-window 中：流式回答时内联显示在 user 消息和 assistant 消息之间

## 4. 文档结构思维导图 (P1-6)

- [x] 4.1 创建 `components/rag/document-mindmap.tsx`：用 React Flow 渲染 DocumentTreeNode 树，自动 dagre 布局（根节点在顶部，子节点向下展开）
- [x] 4.2 实现节点展开/折叠交互：默认展开前 2 层，点击节点的 +/- 控件切换子树可见性
- [x] 4.3 实现检索高亮：当有 retrieval 结果时，匹配 chunk path 到树节点，给对应节点添加高亮边框/发光效果
- [x] 4.4 实现节点 hover tooltip：显示该节点的 summary 文本
- [x] 4.5 处理无 structure tree 的空态：显示 "Document structure not available" 提示

## 5. 检索路径可视化 (P1-7)

- [x] 5.1 创建 `components/rag/retrieval-flow.tsx`：用 React Flow 渲染横向/纵向流程图，节点依次为 Query → Analyze → Rewrite → Summary Recall → Paragraph Refine → Generate → Answer
- [x] 5.2 实现渐进式节点激活：监听 chat-store 的 currentStage 变化，将对应节点从 inactive (灰色) 切换到 active (高亮+动画)，已完成节点变为 completed 色
- [x] 5.3 实现边的动画效果：当节点激活时，前置边呈现流动/脉冲动画
- [x] 5.4 实现检索节点展开：Summary Recall 节点可展开显示 chunks 数量和列表，Paragraph Refine 节点可展开显示 paragraphs
- [x] 5.5 实现无查询时的 idle 态：所有节点灰色 + 提示文字 "Ask a question to see the retrieval path"

## 6. 文档热力图 (P1-8)

- [x] 6.1 创建 `components/rag/document-heatmap.tsx`：用 ECharts treemap 渲染段落矩形块，按 section 分组，颜色映射 relevance score（冷色→暖色）
- [x] 6.2 实现色阶映射：score 0→灰色、0.5→蓝色、0.8→橙色、1.0→红色，未检索段落保持中性灰
- [x] 6.3 实现 hover tooltip：显示段落 index、section path、score (如有)、文本前 100 字符
- [x] 6.4 实现点击交互：点击已检索段落时联动 citation panel 高亮对应引用
- [x] 6.5 实现 section 分组标签：每组段落上方显示 section 标题分隔

## 7. 对比演示分屏 (P1-9)

- [x] 7.1 创建 `app/(pages)/compare/[documentId]/page.tsx`：对比页面，左右分屏布局 + 底部共享输入框
- [x] 7.2 创建 `components/rag/compare-panel.tsx`：单侧面板组件，接收 track 数据（answer、citations、streaming 状态），渲染流式答案 + 引用列表 + stage indicator
- [x] 7.3 实现 compare-store 的 SSE 消费逻辑：调用 `/api/compare`，解析 `compare_track` 事件分发到 naive/hierarchical 两轨
- [x] 7.4 在 document-list 组件中添加 "Compare" 按钮，链接到 `/compare/{documentId}`
- [x] 7.5 实现双轨完成后的对比摘要：两轨都完成时显示 citation 数量对比、回答长度等简要差异

## 8. 性能监控面板 (P1-10)

- [x] 8.1 创建 `components/rag/performance-dashboard.tsx`：面板容器，包含多个指标可视化子组件
- [x] 8.2 实现阶段耗时水平条形图（ECharts 或纯 CSS bar）：每阶段一条，标注毫秒数
- [x] 8.3 实现检索命中摘要卡片：summary chunks 数量、refined paragraphs 数量、score range (min/max/avg)
- [x] 8.4 实现 token 生成速度指标：generating 阶段的 tokens/sec
- [x] 8.5 实现总延迟 donut 图（ECharts）：各阶段占比 + 中心显示总耗时

## 9. Chat 页面集成 (Tab 面板)

- [x] 9.1 重构 chat-window 右侧区域：将 CitationPanel 替换为 Tabs 容器（Citations / Thought Process / Mindmap / Retrieval Path / Heatmap / Performance）
- [x] 9.2 将各可视化组件嵌入对应 Tab：thought-timeline、document-mindmap、retrieval-flow、document-heatmap、performance-dashboard
- [x] 9.3 实现 Tab 切换时的数据联动：所有 Tab 共享同一个 chat-store 状态，切换时无需重新请求
- [x] 9.4 实现小屏适配：屏幕宽度不足时 Tab 面板折叠为可展开的 sheet/drawer

## 10. 端到端验证

- [x] 10.1 Mock 模式完整流程验证：上传文档 → 问答 → 检查所有 6 个 Tab 的可视化效果
- [x] 10.2 对比模式验证：进入 compare 页 → 提问 → 双轨同时流式展示
- [x] 10.3 边界情况检查：空文档树、无检索结果、SSE 错误中断时各组件的表现
