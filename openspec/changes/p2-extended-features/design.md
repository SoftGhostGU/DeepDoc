## Context

P0 已交付：文档上传/管理、流式问答（SSE）、引用溯源、Mock Server、Prisma 持久化。chat-store 管理会话/消息/流式状态。当前对话为单轮——每次 `/api/chat` 只发送当前 query，无历史上下文。引用 score 以 "相关度 93%" 纯文字显示。

Mock 模式运行正常，所有新功能均可在 Mock 下独立开发。

## Goals / Non-Goals

**Goals:**

- 四项 P2 功能全部可在 Mock 模式下演示
- 与现有 P0 代码低耦合——增量添加，不破坏现有流程
- 推荐问题在文档索引后即刻可用，无需用户先提问
- 多轮上下文可配置、可清除、可感知
- 导出功能覆盖单条和全对话两种场景
- 可信度可视化融入现有引用面板和行内标记

**Non-Goals:**

- 不做真实的 LLM 推荐问题生成（Mock 阶段用固定推荐；联调后由 Python 服务生成）
- 不做服务端上下文管理（上下文拼接在前端完成，发给 RAG 服务的只是拼好的 prompt）
- 不做 PDF/Word 导出——仅 Markdown
- 不修改 Python RAG 服务代码

## Decisions

### 1. 推荐问题：Mock 固定 + 未来可接真实接口

**选择**: Mock 模式下按文档 ID 返回固定推荐问题；新增 `/api/suggest` Route Handler，Mock 时返回假数据，联调时转发到 Python 服务
**替代方案**: 前端硬编码 / 完全依赖后端
**理由**: Route Handler 层做一次抽象，和其他 API 保持一致的 Mock/Real 切换模式。前端组件只调 `/api/suggest`，不关心数据来源。

### 2. 多轮上下文：前端拼接 + 可配置窗口

**选择**: chat-store 新增 `contextWindowSize` 字段（默认 5 轮），发送时取最近 N 条消息拼成 `history` 数组随请求发送。`/api/chat` Route Handler 将 `history` 透传给 Python `/api/ask`。
**替代方案**: 服务端维护对话状态 / 全量发送
**理由**: 
- 前端控制最灵活——用户可调整窗口大小、清除上下文
- 服务端保持无状态（产品文档要求 Python 侧"无状态为主"）
- 不全量发送避免 token 浪费

上下文数据结构：
```ts
history: Array<{ role: "user" | "assistant"; content: string }>
```

### 3. 导出：Blob 下载 + Clipboard API

**选择**: 
- 单条导出：Clipboard API 复制 Markdown 到剪贴板
- 全对话导出：生成 Markdown 字符串 → `Blob` → `URL.createObjectURL` → `<a download>`
**替代方案**: 后端生成文件 / 使用第三方库
**理由**: 纯前端操作，无需后端参与。Markdown 格式化简单直接——用户消息为引用块，助手消息保留原文+引用脚注。

### 4. 可信度可视化：进度条 + HSL 颜色映射

**选择**: score (0-1) 映射到进度条宽度 + HSL 颜色渐变（红→黄→绿），在引用面板的每条引用和行内 citation marker 上均展示
**替代方案**: 仅颜色 / 仅数字 / 星级评分
**理由**: 进度条最直观表达"程度"，颜色渐变增加视觉信息密度。HSL 色相从 0（红）到 120（绿）线性映射 score，简单且无需额外依赖。

```
Score 0.3  ██░░░░░░░░  30%  红色
Score 0.6  ██████░░░░  60%  黄色  
Score 0.9  █████████░  90%  绿色
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 多轮上下文消息过长导致 token 超限 | 前端限制窗口大小（默认 5 轮，最大 10），显示 token 估算 |
| 推荐问题联调时 Python 服务可能没有该接口 | Mock 模式完全自足；接口约定提前与 B 沟通 |
| Clipboard API 在某些浏览器受限 | 降级为 `document.execCommand('copy')` 或显示文本让用户手动复制 |
| 导出的 Markdown 中引用格式可能不统一 | 统一用脚注格式 `[^1]: 引用文本`，与 chat-message 中的 `[1]` 对应 |
