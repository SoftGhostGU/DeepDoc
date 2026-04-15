## 1. 字体与依赖

- [x] 1.1 安装 `geist` npm 包（`pnpm add geist`），或确认 `next/font/google` 可加载 Geist Sans/Mono
- [x] 1.2 修改 `web-app/app/layout.tsx`：将 Space_Grotesk / JetBrains_Mono 替换为 Geist Sans / Geist Mono，定义 `--font-sans` 和 `--font-mono` CSS 变量
- [x] 1.3 确保中文 fallback 链：`PingFang SC, Microsoft YaHei, sans-serif`

## 2. CSS 变量与主题

- [x] 2.1 重写 `web-app/app/globals.css` 中 `:root` 的 CSS 变量：定义 `--background`, `--surface`, `--surface-raised`, `--surface-hover`, `--border`, `--border-subtle`, `--foreground`, `--foreground-muted`, `--foreground-dim`, `--accent`, `--accent-hover`, `--accent-muted`, `--accent-subtle`, `--success`, `--warning`, `--destructive`
- [x] 2.2 添加 shadcn/ui 变量映射：`--primary` → `--accent`, `--muted` → `--surface-raised`, `--card` → `--surface-raised`, `--popover` → `--surface-raised` 等
- [x] 2.3 更新 keyframe 动画（shimmer, pulse-glow, cascade-flow, citation-pulse）的色值为新 Indigo 色系
- [x] 2.4 更新 print media query 中的色值

## 3. shadcn/ui 组件适配

- [x] 3.1 更新 `components/ui/button.tsx`：primary 使用渐变 `--accent` → `--accent-muted`，outline 使用 `--border` 描边，ghost hover 使用 `--surface-hover`
- [x] 3.2 更新 `components/ui/card.tsx`：背景 `--surface-raised`，边框 `--border-subtle`，圆角 12px
- [x] 3.3 更新 `components/ui/input.tsx`：背景 `--surface-raised`，边框 `--border-subtle`，focus 时 `--accent` ring，圆角 12px
- [x] 3.4 更新 `components/ui/badge.tsx`：使用半透明背景色系统（accent-subtle、success、warning、destructive 各 10% opacity）
- [x] 3.5 更新 `components/ui/dialog.tsx`：overlay `rgba(0,0,0,0.6)` + backdrop-blur，content 使用 `--surface-raised`
- [x] 3.6 更新 `components/ui/tabs.tsx`：容器 `--surface-raised` 带 padding，active tab 使用 `--accent-subtle` 背景
- [x] 3.7 更新 `components/ui/tooltip.tsx`：背景 `--surface-hover`，文字 12px
- [x] 3.8 更新 `components/ui/scroll-area.tsx`：thumb 使用 `--border` 色，track 透明

## 4. 业务组件颜色迁移

- [x] 4.1 更新 `components/rag/app-sidebar.tsx`：侧边栏背景 `--surface`，导航项使用 `--accent-subtle` 活跃态
- [x] 4.2 更新 `components/rag/chat-input.tsx`：输入框和发送按钮适配新色系
- [x] 4.3 更新 `components/rag/session-sidebar.tsx`：背景和选中态适配
- [x] 4.4 更新 `components/rag/stage-indicator.tsx`：阶段指示器颜色从 cyan 改为 indigo
- [x] 4.5 搜索并替换所有 `.tsx` 文件中硬编码的旧色值（`#0a1628`, `#00d4ff`, `#0ea5e9`, `#f0f9ff`）为 CSS 变量引用

## 5. 页面级别调整

- [x] 5.1 更新 `app/(pages)/layout.tsx`：页面级布局背景和 border 适配
- [x] 5.2 检查 `tailwind.config.ts`：如有自定义色值引用，同步更新

## 6. 验证

- [x] 6.1 启动 dev server，目视检查文档管理页：卡片、按钮、徽章、上传区域、侧边栏
- [x] 6.2 目视检查对话页：消息气泡、引用面板、阶段指示器、输入框、上下文管理器
- [x] 6.3 grep 全局搜索旧色值确认零残留：`grep -r "#0a1628\|#00d4ff\|#0ea5e9\|#f0f9ff" web-app/app web-app/components --include="*.tsx" --include="*.css"`
- [ ] 6.4 验证中文字体 fallback：在 Windows 和 Mac 上确认中文渲染正常
