## 1. 视口锁死的 CSS 链路

- [x] 1.1 `web-app/app/(pages)/layout.tsx`：`<main>` 的 `overflow-auto` 改为 `overflow-hidden`，保持 `flex-1 min-w-0`
- [x] 1.2 `web-app/app/(pages)/chat/[documentId]/page.tsx`：`<section>` 去掉 `min-h-[70vh]`，改为 `h-full`
- [x] 1.3 `web-app/components/rag/chat-window.tsx`：外层 grid 加 `h-full min-h-0`，左右两栏都用 `flex flex-col min-h-0`
- [x] 1.4 小屏回退：`chat-window.tsx` 检测 `window.matchMedia("(max-height: 600px)")`，命中时允许 section 滚动（或在该断点下移除 `overflow-hidden`）

## 2. 聊天区内部滚动

- [x] 2.1 `chat-window.tsx` 聊天列容器使用 `flex-1 min-h-0` + 内部消息区 `ScrollArea h-full`
- [x] 2.2 输入框 + session sidebar 区域保持 `shrink-0`，不参与内部滚动
- [ ] 2.3 验证：消息很多时只在消息区滚动，外层页面无滚动条

## 3. 右侧 Tab 内部滚动

- [x] 3.1 `Tabs` 外层：`flex flex-col h-full min-h-0`；`TabsList` `shrink-0`；每个 `TabsContent` `flex-1 min-h-0 flex flex-col`
- [x] 3.2 `citation-panel.tsx`：确认 `Card flex h-full flex-col` + `CardContent flex-1 min-h-0 p-0` + `ScrollArea h-full` 链路正确（fix-viz change 已基本就位，补齐残留）
- [x] 3.3 `thought-stream.tsx` / `retrieval-flow.tsx` / `document-mindmap.tsx` / `document-heatmap.tsx` / `performance-dashboard.tsx`：顶层容器改为 `flex flex-col h-full`；内容区 `flex-1 min-h-0`，需要滚动时加 `overflow-auto` 或 `ScrollArea h-full`
- [ ] 3.4 验证：任一 Tab 内容超高时，只在该 Tab 面板内滚动

## 4. Expand 按钮与 Dialog

- [x] 4.1 若 `web-app/components/ui/dialog.tsx` 不存在则运行 `pnpm shadcn add dialog` 引入
- [x] 4.2 新建 `web-app/components/rag/panel-expand-dialog.tsx`：薄包装，props `{ open, onOpenChange, title, children }`，尺寸 `max-w-5xl h-[85vh]`，内部 `flex flex-col`，body `flex-1 min-h-0 overflow-auto`
- [x] 4.3 `chat-window.tsx`：在 `TabsList` 右侧追加 `Button variant="ghost" size="icon"`（lucide `Expand` 图标）；维护 `expandedTab: string | null` state
- [x] 4.4 `chat-window.tsx`：根据 `expandedTab === activeTab` 打开 `PanelExpandDialog`，children 根据 `activeTab` 渲染对应组件（复用 CitationPanel / ThoughtStream / DocumentMindmap / RetrievalFlow / DocumentHeatmap / PerformanceDashboard）
- [x] 4.5 为 Dialog 内容加 `key={activeTab}` 强制子组件重建，确保 ECharts / ReactFlow 以新尺寸布局
- [ ] 4.6 验证：每个 Tab 点击 expand 按钮后 modal 打开，显示大尺寸；Esc / 点击背景 / 关闭按钮都能关闭；modal 内滚动不影响底层

## 5. 热力图颜色归一化

- [x] 5.1 `document-heatmap.tsx`：在 treemap option memo 里先计算当前 `retrievedParagraphs` 的 `{min, max}`
- [x] 5.2 新增 `scoreToColorNormalized(score, min, max)`：`max === min` 或结果集 ≤1 条时返回中间色；否则 `t = (score - min) / (max - min)`，按 t 分段映射到红/橙/蓝/浅蓝/灰同一色盘
- [x] 5.3 treemap data 生成处改为调用 `scoreToColorNormalized`
- [x] 5.4 tooltip 保持显示绝对分数（`(d.score * 100).toFixed(0)%`），不改文案
- [ ] 5.5 验证：top-K 全在 0.9+ 时，仍能看到红→橙→蓝的梯度；单条结果显示为中间色；空结果走既有空态

## 6. 验证

- [x] 6.1 `pnpm lint` 与 `pnpm exec tsc --noEmit` 通过
- [ ] 6.2 手动回归：桌面 1440x900、笔记本 1366x768、窄屏 1280x720 下视口均不出现滚动条；1024x500 的窄短屏下可以滚动不卡死
- [ ] 6.3 手动回归：每个 Tab 切换 → expand → 关闭 → 再切换，交互无残留状态
- [ ] 6.4 手动回归：发一次真实提问，观察热力图至少能看出 top 1 与 top 5 的颜色差异

## 7. 归档与 PR

- [x] 7.1 `openspec validate panel-ux-refinements --strict`
- [ ] 7.2 提交 PR，关联本 change 目录
- [ ] 7.3 合入后 `openspec archive panel-ux-refinements`
