## Why

当前 DeepDoc 使用"深海研究站"主题（#0a1628 深蓝背景 + #00d4ff 亮青色强调），视觉疲劳严重，青色过于刺眼且缺乏层次感。需要一套更专业、现代、护眼的暗色主题，提升长时间阅读和问答的舒适度。

## What Changes

- 全局配色从"Deep Sea Navy + Cyan"切换为"Polished Slate + Indigo"（Zinc 灰阶 + Indigo 强调色）
- 字体从 Space Grotesk / JetBrains Mono 切换为 Geist / Geist Mono
- 新增三级表面层次体系：`#09090B`（底色）→ `#111113`（侧边栏）→ `#18181B`（卡片/输入框）
- 状态色标准化：绿色（已索引/高可信度）、黄色（处理中/中等）、红色（失败/低可信度）
- 组件样式统一：圆角卡片 + 细边框、渐变强调按钮、标签/徽章系统
- 修改所有 shadcn/ui 组件变量映射适配新主题
- 更新 globals.css CSS 变量和动画配色

## Capabilities

### New Capabilities
- `polished-slate-theme`: 全局配色体系重构——CSS 变量定义、表面层次、强调色映射、状态色规范
- `typography-system`: 字体切换至 Geist 家族，统一标题/正文/代码的字号和行高规范
- `component-styling`: shadcn/ui 组件（Button、Card、Input、Badge、Dialog、Tabs、Tooltip、ScrollArea）样式适配新主题

### Modified Capabilities

## Impact

- `web-app/app/globals.css`：全部 CSS 变量重写
- `web-app/app/layout.tsx`：字体导入从 Space_Grotesk/JetBrains_Mono 改为 Geist/Geist_Mono
- `web-app/components/ui/*.tsx`：所有 shadcn/ui 组件变量映射更新
- `web-app/components/rag/*.tsx`：业务组件硬编码颜色替换为 CSS 变量
- `web-app/tailwind.config.ts`：如有自定义色值需同步更新
- 依赖变更：需添加 `geist` npm 包（Google Fonts 或 npm 分发）
