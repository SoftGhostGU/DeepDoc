## Context

聊天工作区当前布局：`app/(pages)/layout.tsx` 的 `<main>` 带 `overflow-auto`，`chat/[documentId]/page.tsx` 的 section 带 `min-h-[70vh]`，导致整页一起滚。右侧六个 Tab（引用/思考/导图/路径/热力/性能）渲染在约 340px 宽的面板里，信息密度高的可视化（导图、treemap、流程图）在这个尺寸下可读性差。`document-heatmap.tsx::scoreToColor` 使用固定阈值（>=0.9 红、>=0.7 橙、>=0.5 蓝），而 reranker 返回的 top-K 段落分数长期落在 0.9+ 区间，色阶区分力失效。

## Goals / Non-Goals

**Goals:**
- 视口锁死：窗口不出现外层滚动条，头部 + 主工作区完全填满视口高度。
- 聊天区与右侧 Tab 内部各自独立滚动，不互相干扰。
- 右侧 Tab 提供"放大查看"入口，点击后在 modal 中以大尺寸渲染当前 Tab 内容。
- 热力图颜色基于当前结果集相对位置归一化，让 top-K 段落之间的差异可见。

**Non-Goals:**
- 不改变 Tab 的数量、顺序或交互语义。
- 不重构底层检索/评分逻辑；tooltip 仍展示绝对分数。
- 不做移动端完整适配（只保证窄屏不崩）；移动端详细布局延后。
- 不实现 modal 内的对比/多 Tab 并排能力（为未来留口）。

## Decisions

### D1: 视口锁死的 CSS 链路

**决策**：`<main>` 从 `overflow-auto` → `overflow-hidden`；page.tsx 的 `section` 去掉 `min-h-[70vh]` 改为 `h-full`；grid 容器加 `min-h-0`，让左右两栏都能在 grid 行内正确收缩。聊天区 `ChatWindow` 和右侧 `Tabs` 内部统一使用 `flex flex-col` + 头部 `shrink-0` + 内容 `flex-1 min-h-0` + 最内层 `ScrollArea h-full` 的模式。

**理由**：Flex/Grid 子项默认 `min-height: auto`，内容一旦撑满就会把父容器顶大，导致外层出现滚动条。`min-h-0` 打破这个默认，让高度约束真正传到子项；最后在需要滚动的那一层再加 `overflow-auto`（通过 `ScrollArea`）把内容关进去。

**备选**：用固定 `h-[calc(100vh-64px)]` 硬写高度 — 拒绝，因为头部高度可变（响应式 + 通知条等），硬写容易漂移。

### D2: 放大按钮与 Dialog 的组织方式

**决策**：在 `Tabs` 的 `TabsList` 右侧追加一个 `ghost` `icon` 按钮（lucide `Expand`），不属于任何一个 Tab，点击时以当前 `activeTab` 为参数打开一个共享的 `Dialog`。Dialog 内根据 `activeTab` 渲染对应的 Tab 内容（复用现有组件，如 `CitationPanel` / `DocumentMindmap` / `RetrievalFlow` / `DocumentHeatmap` 等），尺寸为 `max-w-5xl` + `h-[85vh]`，内部同样 `flex flex-col` + 内容 `flex-1 min-h-0 overflow-auto`。

**理由**：单按钮跟随 Tab 切换，比"每个 Tab 自己挂一个按钮"更简洁，也避免组件各自引入 Dialog 依赖。子组件接收的 props 不变，只是被渲染到更大的容器里。

**备选 1**：每个 Tab 组件内部自带全屏按钮 — 拒绝，六处重复样板、Dialog 状态散落。
**备选 2**：开一个新路由 `/chat/:id/view/:tab` — 拒绝，体验更像"离开页面"，且与"快速放大看一眼"的诉求不符。

### D3: 热力图颜色归一化

**决策**：`scoreToColor` 接收 `score` 和当前结果集的 `{min, max}`，按 `(score - min) / (max - min)` 归一到 [0,1]，再走同一套分段（>=0.8 红、>=0.6 橙、>=0.4 蓝、>0 浅蓝、=0 灰）。tooltip 保持显示绝对分数 `相关度 XX%`，不改文案。结果集只有 1 个段落或 max==min 时，退化为中间色（橙）。

**理由**：reranker 分数绝对值不稳定（不同模型、不同 query 分布差异大），而"同一次检索中哪条最相关"才是用户关心的信息。相对归一化在数学上等价于"把当前 top-K 的分布映射到颜色盘"，而 tooltip 的绝对分数保留了可追溯性。

**备选**：用百分位数（ECharts `visualMap` 的 pieces）— 拒绝，top-K 常常只有 5-10 条，百分位粒度过粗；min-max 更直观。

### D4: 封装 `PanelExpandDialog` 组件

**决策**：新建 `web-app/components/rag/panel-expand-dialog.tsx`，props 为 `{ open, onOpenChange, title, children }`。`ChatWindow` 持有 `expandedTab` state，打开 Dialog 时根据 `expandedTab` 在 children slot 里渲染对应组件。组件本身不感知业务 Tab 语义，只负责 modal 外壳。

**理由**：薄包装避免"Dialog + 样式"在六处重复；同时不把 Tab 切换逻辑耦合进 modal。

## Risks / Trade-offs

- **风险**：超小屏（`<640px` 宽或 `<480px` 高）下，视口锁死后聊天输入框可能挤压到不可见。**缓解**：在 `chat-window.tsx` 外层容器增加 `@media (max-height: 600px)` 回退为 `overflow-y:auto`，或检测 `window.matchMedia("(max-width: 640px)")` 时让 section 恢复 `min-h` 策略。
- **风险**：Dialog 内重新渲染 `ReactECharts` / `ReactFlow` 时，`onResize` 需要正确触发，否则图表仍按旧宽高绘制。**缓解**：Dialog 内用 `key={activeTab}` 强制重建；ECharts 的 `ResizeObserver` 已默认启用，ReactFlow 侧 `fitView` 在 `onInit` 中触发。
- **风险**：min-max 归一化在只有 1 条段落时没有区分意义。**缓解**：`max === min` 时固定返回中间色，tooltip 仍给出真实分数，视觉上不误导。
- **风险**：`overflow-hidden` 可能遮挡意外的高内容（长 toast、下拉菜单）。**缓解**：Radix 的 Portal 已把 popover/toast/dropdown 挂在 body 层，不受 main overflow 影响；若发现问题再按组件打补丁。
- **回退**：纯前端改动，revert 对应 commit 即可；无数据层变更。
