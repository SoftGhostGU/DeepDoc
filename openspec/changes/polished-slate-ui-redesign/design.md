## Context

DeepDoc 当前使用"深海研究站"暗色主题，存在以下问题：
- 深蓝底色 (#0a1628) + 亮青强调色 (#00d4ff) 对比过强，长时间使用引发视觉疲劳
- 缺乏系统性的表面层次，卡片和侧边栏与背景区分不清
- Space Grotesk 字体在中文混排场景下不够协调
- 状态色未标准化，各处硬编码不同的色值

参考设计稿位于 `D:/vscode/Microsoft VS Code/pencil-new.pen`，包含文档管理页和对话页两个完整视觉方案。

## Goals / Non-Goals

**Goals:**
- 建立基于 Zinc 灰阶 + Indigo 强调色的"Polished Slate"主题
- 三级表面层次体系：底色 → 侧边栏 → 卡片/输入框
- 统一状态色规范（green/yellow/red）用于文档状态和可信度指标
- 切换至 Geist 字体家族，优化中英混排体验
- 所有颜色通过 CSS 变量管理，保留未来 light mode 扩展能力

**Non-Goals:**
- 不实现 Light Mode（仅预留变量结构）
- 不修改组件功能逻辑，仅修改视觉样式
- 不重构页面布局结构（布局属于其他 change）
- 不修改 Python 后端或 API

## Decisions

### 1. 色彩体系：Zinc + Indigo

**选择**: 使用 TailwindCSS Zinc 灰阶作为中性色，Indigo-500 作为主强调色。

**理由**: Zinc 是最中性的灰阶（无明显冷暖偏向），适合长文档阅读。Indigo 比 Cyan 更柔和，视觉疲劳度低。此组合被 Vercel、Linear、shadcn/ui 官方等现代应用广泛验证。

**替代方案**:
- Slate + Blue: 偏冷，与现有 Navy 主题差异不够明显
- Neutral + Violet: 紫色辨识度高但不够专业
- Stone + Emerald: 偏暖，与文档分析工具气质不符

**色值映射**:
```
--background:      #09090B   (zinc-950)
--surface:         #111113   (自定义，sidebar)
--surface-raised:  #18181B   (zinc-900, cards)
--surface-hover:   #27272A   (zinc-800)
--border:          #3F3F46   (zinc-700)
--border-subtle:   #27272A   (zinc-800)
--foreground:      #FAFAFA   (zinc-50)
--foreground-muted:#A1A1AA   (zinc-400)
--foreground-dim:  #71717A   (zinc-500)
--accent:          #6366F1   (indigo-500)
--accent-hover:    #818CF8   (indigo-400)
--accent-muted:    #4F46E5   (indigo-600)
--accent-subtle:   #6366F11A (indigo-500 at 10%)
--success:         #22C55E   (green-500)
--warning:         #EAB308   (yellow-500)
--destructive:     #EF4444   (red-500)
```

### 2. 字体：Geist 家族

**选择**: 正文和标题使用 Geist Sans，代码和元数据使用 Geist Mono。

**理由**: Geist 是 Vercel 为 UI 场景专门设计的字体，西文字形精致且与中文 fallback（PingFang SC、Microsoft YaHei）混排效果好。Geist Mono 视觉上比 JetBrains Mono 更紧凑，适合行内引用标记。

**安装**: 通过 `next/font/google` 或 `geist` npm 包加载（Next.js 已有内置支持）。

### 3. 表面层次体系

**选择**: 三级递进 + border 分割

```
Level 0: #09090B  (页面底色)
Level 1: #111113  (侧边栏、面板底色)
Level 2: #18181B  (卡片、输入框、弹窗)
Hover:   #27272A  (交互态)
```

**理由**: 通过微妙的明度递进创造深度感，不依赖阴影（暗色主题下阴影效果弱）。辅以 `#27272A` 或 `#3F3F46` 的 1px border 增强边界感。

### 4. 渐变按钮

**选择**: 主要操作按钮使用 `linear-gradient(#6366F1, #4F46E5)`。

**理由**: 微妙的渐变比纯色更有质感，同时不会过于花哨。

## Risks / Trade-offs

- **[中文字体 fallback]** → Geist 不含中文字符，需确保 fallback 链完整。保留 `PingFang SC, Microsoft YaHei, sans-serif` 作为 fallback。
- **[现有硬编码颜色]** → 部分业务组件可能有硬编码的 `#00d4ff` 或 `#0a1628`。需逐个文件排查替换。用 grep 搜索所有 `#0a` 和 `#00d4` 开头的色值。
- **[动画配色依赖]** → globals.css 中的 keyframe 动画（shimmer, pulse-glow 等）使用了旧配色，需同步更新。
- **[shadcn/ui 变量覆盖]** → shadcn/ui 组件依赖特定 CSS 变量名（如 `--primary`, `--secondary`），需确保映射正确。
