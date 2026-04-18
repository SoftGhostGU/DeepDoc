## Why

问答工作区当前三个实际使用痛点：

1. **整个视口可以上下滚动**：`app/(pages)/layout.tsx` 中 `<main>` 用了 `overflow-auto`，`chat/[documentId]/page.tsx` 的 section 又有 `min-h-[70vh]`，一旦聊天或右侧 tab 内容高一点，就让整个页面一起滚。期望的体验是：视口被锁死，头 + 左右两栏撑满高度，对话与右侧 Tab 各自在面板内部滚动。
2. **右侧 Tab 面板缺少"放大查看"入口**：引用 / 思考 / 导图 / 路径 / 热力 / 性能这几个可视化在 340px 宽的侧栏里看不清，需要一个放大按钮弹出 modal，在大尺寸下观察细节。
3. **热力图一片红**：后端给出的 paragraph score 是绝对值（reranker/相似度），top-K 的相关段落常年都在 0.9+，颜色分段阈值 `>=0.9` 把所有块都染成红色，视觉上失去区分力。

这些问题合起来让"可视化右栏"在真实使用中既不舒服也看不懂。

## What Changes

- 视口锁死：把 `<main>` 从 `overflow-auto` 改为 `overflow-hidden`；page.tsx 的 `section` 去掉 `min-h-[70vh]`；grid 内的 `ChatWindow` / `SessionSidebar` 通过 `min-h-0` 链路把高度约束传下去。
- 对话栏 & 右侧 Tab 各自内部滚：聊天消息区、引用/思考/导图/路径/热力/性能每个 Tab 内容都使用 `flex flex-col` + `flex-1 min-h-0` + 内部 `ScrollArea h-full` 的模式，在面板内部滚动，不影响整个页面。
- 新增"放大"按钮：在右侧 Tab 面板的 Tab 头右侧加一个 `Expand` icon button；点击弹出 shadcn `Dialog`（modal），把当前激活 Tab 的内容在更大尺寸（例如 `max-w-5xl`、`h-[85vh]`）下重新渲染。Modal 内部同样支持滚动。
- 热力图颜色归一化：`scoreToColor` 接收当前结果集的 min / max，使用相对位置（归一化到 [0,1]）决定色阶；tooltip 仍显示绝对分数。这样 top-K 内部的差异才看得出来。

## Capabilities

### New Capabilities
- `visualization-panel-expand`：右侧 Tab 支持放大查看的交互。作为独立能力方便以后复用（compare 视图等）。

### Modified Capabilities
- `document-heatmap`：颜色映射从绝对阈值改为相对归一化。
- `polished-slate-ui-redesign`（或承载整体布局契约的 capability）：明确问答工作区视口不可整体滚动、对话与右栏各自内部滚。若无合适容器可放此规则，则新建 `chat-workspace-layout` capability。

## Impact

- 代码：
  - `web-app/app/(pages)/layout.tsx`（main overflow）
  - `web-app/app/(pages)/chat/[documentId]/page.tsx`（去 min-h-70vh）
  - `web-app/components/rag/chat-window.tsx`（左右两栏高度链路 + Tab 头放大按钮 + Dialog）
  - `web-app/components/rag/document-heatmap.tsx`（颜色归一化）
  - 可能新增 `web-app/components/rag/panel-expand-dialog.tsx`（一个薄包装，统一 modal 样式）
  - `web-app/components/ui/dialog.tsx` 若未安装需 `pnpm shadcn add dialog`
- 数据/后端：无。
- 回退：纯前端 revert。
- 风险：视口锁死后，超小屏（<480px 高）可能挤压聊天区。缓解：保留最小高度 + 移动端竖排布局下恢复允许滚动。
