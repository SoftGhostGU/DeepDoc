## 1. 共享工具函数

- [x] 1.1 创建 `lib/utils/credibility.ts`：导出 `getCredibilityColor(score: number): string`，将 0-1 分数映射到 HSL 颜色（0→红、0.5→黄、1.0→绿），返回 CSS hsl() 字符串
- [x] 1.2 创建 `lib/utils/export-markdown.ts`：导出 `formatMessageAsMarkdown(message)` 和 `formatSessionAsMarkdown(messages, documentName, sessionTitle)` 两个函数，处理引用脚注格式转换

## 2. 推荐问题 + 文档导读 (P2-4)

- [x] 2.1 扩充 Mock 数据 (`lib/mock/data.ts`)：新增 `mockSuggestedQuestions`（3-5 个中文推荐问题）和 `mockDocumentOverview`（文档摘要信息）
- [x] 2.2 创建 `/api/suggest/route.ts`：GET 接收 `docId` 参数，Mock 模式返回固定推荐问题，真实模式转发到 Python 服务
- [x] 2.3 创建 `components/rag/suggested-questions.tsx`：推荐问题芯片/按钮组，接收问题列表和 onSelect 回调，点击提交问题
- [x] 2.4 创建 `components/rag/document-overview.tsx`：文档导读卡片，显示文档名、页数、章节数、摘要文本
- [x] 2.5 将推荐问题和文档导读集成到 chat-window：空会话时显示导读卡片 + 推荐问题；发送第一条消息后隐藏

## 3. 多轮对话 + 上下文管理 (P2-7)

- [x] 3.1 扩展 chat-store：新增 `contextWindowSize`（默认 5）、`contextCleared` 标记、`setContextWindowSize()` 和 `clearContext()` 方法
- [x] 3.2 修改 chat-store 的 `sendMessage`：发送前取最近 N 轮历史消息组装 `history` 数组，随 `/api/chat` POST body 发送
- [x] 3.3 修改 `/api/chat/route.ts`：从请求 body 读取 `history` 字段，Mock 模式下忽略，真实模式下透传给 Python `/api/ask`
- [x] 3.4 创建 `components/rag/context-manager.tsx`：上下文管理小面板——显示"上下文: N/M 轮"、窗口大小调节滑块/下拉、"清除上下文"按钮
- [x] 3.5 将 context-manager 集成到 chat-input 区域上方或工具栏中
- [x] 3.6 实现上下文清除视觉效果：清除后在消息流中插入一条"── 上下文已清除 ──"分隔线

## 4. 答案导出 Markdown (P2-8)

- [x] 4.1 创建 `components/rag/copy-answer-button.tsx`：单条消息的复制按钮，Clipboard API 复制 Markdown（含引用脚注），成功后显示"已复制"图标反馈
- [x] 4.2 将 copy-answer-button 集成到 chat-message 的 assistant 消息中（hover 时显示在消息右上角）
- [x] 4.3 创建 `components/rag/export-conversation-button.tsx`："导出对话"按钮，生成完整 Markdown → Blob → 触发下载，文件名格式 `DeepDoc-{docName}-{sessionTitle}-{date}.md`
- [x] 4.4 将 export-conversation-button 集成到 chat 页面的 header/toolbar 区域

## 5. 可信度可视化 (P2-5)

- [x] 5.1 创建 `components/rag/credibility-bar.tsx`：水平进度条组件，接收 score (0-1)，宽度和颜色均映射自 score，旁边显示百分比文字
- [x] 5.2 修改 `components/rag/citation-panel.tsx`：在每条引用中将纯文字 "相关度 XX%" 替换为 `<CredibilityBar score={score} />`
- [x] 5.3 修改 `components/rag/citation-marker.tsx`：根据 score 给行内标记添加背景色 tint（高分绿、低分红），使用 getCredibilityColor
- [x] 5.4 修改 `components/rag/citation-summary-footer.tsx`：在"基于 N 个来源"旁添加彩色小圆点，每个圆点颜色对应一个引用的 score

## 6. 验证

- [ ] 6.1 Mock 模式验证推荐问题流程：进入空会话 → 看到导读卡片和推荐问题 → 点击推荐问题 → 流式回答 → 推荐问题消失
- [ ] 6.2 多轮对话验证：发送问题 → 回答后追问 → 检查请求中 history 字段包含上轮内容 → 调整窗口大小 → 清除上下文 → 看到分隔线
- [ ] 6.3 导出验证：hover 消息 → 点复制按钮 → 粘贴检查 Markdown 格式 → 点导出对话 → 检查下载文件内容
- [ ] 6.4 可信度可视化验证：引用面板中进度条颜色正确 → 行内 marker 颜色与面板一致 → footer 小圆点与 score 对应
