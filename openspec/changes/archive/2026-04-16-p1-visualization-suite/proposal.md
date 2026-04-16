## Why

P0 阶段已完成了完整的问答骨架（上传、流式对话、引用溯源），但 DeepDoc 的核心卖点——"看得见的检索"——还只停留在一行文字状态指示器。没有可视化，系统与普通 RAG 聊天框无异，无法在答辩演示中体现层级化 RAG 的技术深度和差异化价值。所有 P1 可视化所需依赖（React Flow、ECharts）和 Mock 数据已就绪，现在是最佳开工时机。

## What Changes

- 新增流式思考过程 UI：将单行 stage indicator 升级为动画时间轴，展示每个 RAG 阶段（分析→改写→摘要检索→段落检索→生成）的状态、耗时和中间结果
- 新增文档结构思维导图：用 React Flow 将文档的 `DocumentTreeNode` 层级结构渲染为可交互的树状图，支持展开/折叠和节点高亮
- 新增检索路径可视化：用 React Flow 动画展示检索流程图（Query→各阶段→命中 Chunk），节点随 SSE 事件逐步点亮
- 新增文档热力图：用 ECharts 将文档段落按检索相关度染色，生成可视化的文档缩略图
- 新增对比演示分屏 UI：左右分屏同时展示朴素 RAG 和层级 RAG 的流式回答、引用和检索路径
- 新增性能监控面板：展示各 RAG 阶段耗时、检索命中率、token 生成速度等指标

## Capabilities

### New Capabilities

- `streaming-thought-process`: 流式思考过程动画时间轴 UI，替代当前简单 stage indicator
- `document-mindmap`: 文档结构思维导图，React Flow 渲染 DocumentTreeNode 层级树
- `retrieval-path-visualization`: 检索路径可视化，React Flow 动画展示检索流程 + 命中 chunk
- `document-heatmap`: 文档热力图，ECharts 段落相关度染色缩略图
- `compare-split-view`: 对比演示分屏 UI，朴素 vs 层级 RAG 双路并行展示
- `performance-dashboard`: 性能监控面板，各阶段耗时和检索指标可视化

### Modified Capabilities

（无已有能力需要修改）

## Impact

- **组件**: 新增 6+ 个可视化组件到 `components/rag/`
- **页面**: 新增对比演示页面；修改 chat 页面布局以集成可视化面板
- **Store**: 扩展 `chat-store` 以跟踪阶段耗时和中间检索结果；新增 compare-store
- **Mock 数据**: 需要扩充 `lib/mock/data.ts` 以提供更丰富的文档树和段落数据
- **依赖**: 无需新增——React Flow (`@xyflow/react`) 和 ECharts (`echarts`, `echarts-for-react`) 已安装
