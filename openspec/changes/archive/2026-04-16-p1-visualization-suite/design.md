## Context

P0 已交付完整的 Next.js 应用骨架：文档上传/管理、流式问答、引用溯源、Mock Server、Prisma 数据库。当前 `stage-indicator.tsx` 仅 30 行，只显示一行文字（如"Analyzing query..."）。所有可视化依赖已安装：`@xyflow/react`（React Flow）和 `echarts` + `echarts-for-react`。Mock 数据中已有 `DocumentTreeNode` 树结构、`RetrievedChunk` 检索结果和 SSE 分阶段事件。

chat-store 已具备 `currentStage` 和 `isStreaming` 状态，SSE 事件解析已完整实现（stage、token、retrieval_summary、retrieval_paragraphs、final）。

## Goals / Non-Goals

**Goals:**

- 六个可视化特性全部可在 Mock 模式下独立演示
- 每个可视化组件可独立使用，也可组合嵌入 chat 页面
- 扩展 chat-store 以跟踪阶段时间戳和中间检索结果，驱动所有可视化
- 新增 compare-store 驱动对比分屏的双轨 SSE 消费
- 丰富 mock 数据以支撑更真实的演示效果

**Non-Goals:**

- 不做 P2 功能（推荐问题、多文档、导出等）
- 不修改 Python RAG 服务——所有可视化仅消费现有 SSE 事件格式
- 不引入新的 npm 依赖
- 不做移动端适配

## Decisions

### 1. 可视化组件集成方式：Tab 面板

**选择**: chat 页面右侧使用 Tab 切换面板（Citations / Mindmap / Retrieval Path / Heatmap / Performance）
**替代方案**: 多个浮动抽屉 / 全部平铺
**理由**: Tab 模式节省屏幕空间，用户按需查看不同维度，且不改变现有 chat layout 的 grid 结构——只需将右侧 CitationPanel 替换为一个 Tabs 容器。

```
┌─────────────────────────────────────────────────────────────────┐
│  Session    │  Conversation                │  [Tab] Panel       │
│  Sidebar    │                              │  ┌─────────────┐  │
│             │  User: ...                   │  │ Citations    │  │
│  Chat 1     │  Assistant: ...              │  │ Mindmap      │  │
│  Chat 2     │                              │  │ Retrieval    │  │
│             │  [Stage: Retrieving...]      │  │ Heatmap      │  │
│             │                              │  │ Performance  │  │
│             │  [Input box]                 │  └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 流式思考过程：垂直时间轴 + 展开动画

**选择**: 垂直时间轴组件，每个阶段一个节点（图标+名称+耗时），完成时展开显示中间结果
**替代方案**: 水平进度条 / 仅改善文字描述
**理由**: 垂直时间轴最直观展示"分阶段"的概念，且可嵌入 chat 对话流中（作为 assistant 消息的一部分），也可在右侧 Tab 中独立展示。

阶段数据来源：扩展 chat-store，在每个 stage 事件到达时记录时间戳。

### 3. React Flow 用法：共享配置，两个独立组件

**选择**: `document-mindmap.tsx` 和 `retrieval-flow.tsx` 各自独立使用 React Flow，共享节点/边样式
**替代方案**: 一个通用的 flow 渲染器
**理由**: 思维导图是静态树结构（dagre 或 elk 布局），检索路径是动态流程图（随 SSE 事件逐步点亮）。两者数据模型和交互模式差异大，抽象收益低、复杂度高。共享的部分仅是节点样式（提取到 `components/rag/flow-nodes.tsx`）。

### 4. 文档热力图：ECharts 自定义矩形 treemap

**选择**: 用 ECharts treemap 图表，每个段落一个矩形块，颜色映射检索相关度分数
**替代方案**: Canvas 自绘 / SVG 手绘 / 简单列表染色
**理由**: ECharts treemap 开箱即用支持分层矩形、颜色映射和 tooltip，正好匹配"文档缩略图+染色"需求。mock 数据中 `ParagraphItem` + `RetrievedChunk.score` 可直接映射。

### 5. 对比分屏：独立页面 + compare-store

**选择**: 新建 `app/(pages)/compare/[documentId]/page.tsx`，使用独立的 compare-store 管理双轨 SSE 状态
**替代方案**: 在 chat 页面内嵌分屏模式
**理由**: 对比模式的 UI 布局和数据流与正常 chat 差异大（双路并行 SSE、左右分屏、独立引用面板），塞进 chat 页面会使 chat-window 组件过于复杂。独立页面更清晰，从文档列表可直接进入。

```
┌──────────────────────────────────────────┐
│  Compare: document_name                  │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  Naive RAG   │  │ Hierarchical │     │
│  │              │  │    RAG       │     │
│  │  [streaming] │  │  [streaming] │     │
│  │              │  │              │     │
│  │  Citations:  │  │  Citations:  │     │
│  │  [1] ...     │  │  [1] ...     │     │
│  └──────────────┘  └──────────────┘     │
│                                          │
│  [Input: Ask a question to compare]      │
└──────────────────────────────────────────┘
```

### 6. Store 扩展策略

**选择**: 扩展现有 chat-store 新增字段（stageTimestamps、retrievedChunks、retrievedParagraphs），新建 compare-store
**替代方案**: 将所有可视化状态放独立 visualization-store
**理由**: 阶段时间戳和中间检索结果本身就是 chat 流程的一部分，放在 chat-store 中最自然。compare-store 独立是因为对比模式有完全不同的双轨 SSE 数据流。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| React Flow 在大文档树（100+ 节点）下性能问题 | 初始仅展开前 2 层，深层按需展开；使用 React Flow 内置虚拟化 |
| ECharts treemap 段落数量过多时布局拥挤 | 限制最大显示段落数（如 200），超出部分分页或聚合 |
| Tab 面板在小屏幕上占空间太大 | 小屏时 Tab 面板折叠为 sheet/drawer，点击展开 |
| compare-store 的双轨 SSE 解析复杂度 | Mock 已有 compare stream 实现，可先对接 mock 验证逻辑 |
| Mock 数据太简单无法体现可视化效果 | 扩充 mock 数据到 10+ 章节、30+ 段落、5+ citations |
