## Why

P0 问答骨架和 Mock 体系已完成，但当前用户体验仍然比较"裸"：用户上传文档后不知道问什么、对话没有上下文记忆无法追问、回答无法离线保存、引用可信度只有一个数字。这四项 P2 功能直接提升产品的可用性和完成度，在答辩演示中能体现"完整产品思维"而非仅仅是技术 demo。

## What Changes

- **推荐问题 + 文档导读**: 文档索引完成后自动生成 3-5 个推荐问题和文档摘要导读卡片，帮助用户快速上手
- **多轮对话 + 上下文管理**: 发送消息时携带历史上下文（可配置窗口大小），支持追问；用户可查看/清除当前上下文
- **答案导出 (Markdown)**: 单条回答一键复制为 Markdown，整个对话导出为 `.md` 文件下载
- **可信度可视化**: 引用的 relevance score 用进度条+颜色渐变可视化展示（替代纯数字），在引用面板和行内 marker 上均有体现

## Capabilities

### New Capabilities

- `suggested-questions`: 推荐问题生成与展示 + 文档导读摘要卡片
- `multi-turn-context`: 多轮对话上下文管理——携带历史、追问、上下文窗口控制
- `answer-export`: 回答与对话导出为 Markdown 文件
- `credibility-visualization`: 引用可信度评分可视化（进度条 + 颜色）

### Modified Capabilities

（无已有能力需要修改——所有新功能为增量添加）

## Impact

- **组件**: 新增 4-5 个组件 (`suggested-questions.tsx`, `context-manager.tsx`, `export-button.tsx`, `credibility-bar.tsx`)
- **Store**: 扩展 chat-store 新增上下文窗口管理字段
- **Mock 数据**: 新增推荐问题和文档摘要的 Mock 数据
- **Route Handler**: 可能新增 `/api/suggest` 端点（或复用 Mock 逻辑）
- **API 调用**: `/api/chat` 请求 body 新增 `history` 字段传递历史消息
- **UI**: chat 页面新增推荐问题区域、上下文指示器、导出按钮；引用面板中 score 展示升级
