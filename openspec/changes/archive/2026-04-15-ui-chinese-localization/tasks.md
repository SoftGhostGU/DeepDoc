## 1. 布局与 Metadata

- [x] 1.1 `app/layout.tsx`：`lang="en"` → `lang="zh-CN"`，metadata title 改为 "DeepDoc"，description 改为中文描述

## 2. 文档管理组件

- [x] 2.1 `components/rag/document-upload.tsx`：标题 "Upload document" → "上传文档"、描述 → "支持 PDF、Markdown 和文本文件，最大 20MB"、拖拽区 "Drag and drop a file" → "拖拽文件到此处"、"Drop a file here, or browse from your computer." → "将文件拖到此处，或从电脑中选择"、按钮 "Upload file" → "上传文件"、"Uploading..." → "上传中..."、验证错误 → 中文
- [x] 2.2 `components/rag/document-list.tsx`：状态映射 UPLOADING→"上传中" / PARSING→"解析中" / INDEXED→"已索引" / FAILED→"失败"、删除对话框 "Delete document?" → "删除文档？"、"Delete" → "删除"、"Deleting..." → "删除中..."
- [x] 2.3 `components/rag/empty-state.tsx`："No documents yet" → "暂无文档"、描述 → "上传您的第一个 PDF、Markdown 或文本文件，开始智能问答"
- [x] 2.4 `app/(pages)/documents/page.tsx`：标题 "Document Management" → "文档管理"、描述 → "上传源文件，打开已索引文档进入问答工作区"、"Loading documents..." → "加载中..."

## 3. 导航侧边栏

- [x] 3.1 `components/rag/app-sidebar.tsx`："Documents" → "文档库"、aria-label "Refresh documents" → "刷新文档列表"

## 4. 问答界面组件

- [x] 4.1 `components/rag/chat-input.tsx`：placeholder "Ask a question about this document..." → "输入关于此文档的问题..."、提示 "Enter to send, Shift+Enter for newline" → "按 Enter 发送，Shift+Enter 换行"
- [x] 4.2 `components/rag/chat-window.tsx`："Conversation" → "对话"、空态提示 "Start by asking a question about this document." → "向文档提问，开始智能问答吧"、错误区 "Dismiss" → "关闭"、"Context view" → "上下文视图"
- [x] 4.3 `components/rag/chat-message.tsx`："Inline citations:" → "行内引用："
- [x] 4.4 `components/rag/stage-indicator.tsx`：阶段映射 analyzing→"分析查询意图..." / rewriting→"改写查询..." / retrieving_summary→"检索摘要候选..." / retrieving_paragraphs→"检索源段落..." / generating→"生成回答..."
- [x] 4.5 `app/(pages)/chat/[documentId]/page.tsx`："Chat Workspace" → "问答工作区"、"Document:" → "文档："、"New Chat" → "新对话"

## 5. 引用相关组件

- [x] 5.1 `components/rag/citation-panel.tsx`：标题 "Citations" → "引用来源"、"No citations for this message yet." → "暂无引用"、"Score" → "相关度"、"View in context" → "查看上下文"
- [x] 5.2 `components/rag/citation-summary-footer.tsx`："Based on N sources" → "基于 N 个来源"
- [x] 5.3 `components/rag/citation-marker.tsx`：aria-label 汉化 ("Open citation" → "查看引用")

## 6. 会话侧边栏

- [x] 6.1 `components/rag/session-sidebar.tsx`："Chat sessions" → "对话记录"、"Untitled" → "未命名对话"、"New" → "新建"、"No chat sessions yet." → "暂无对话记录"

## 7. Mock 数据汉化

- [x] 7.1 `lib/mock/data.ts`：文档树标题汉化（"DeepDoc Product Plan"→"DeepDoc 产品方案"、section 标题→中文）、段落文本→中文、mock 回答文本→中文、citations path→中文（"第二章 > 第 2.1 节 > 段落 2"）
- [x] 7.2 `lib/mock/sse.ts`：stage message 汉化（"Analyzing query intent..."→"正在分析查询意图..."、"Rewriting query..."→"正在改写查询..."、等）、compare stream 的 stage message 同步汉化

## 8. 验证

- [ ] 8.1 启动 dev server，Mock 模式下走完整流程（上传→文档列表→进入问答→流式回答→引用面板），确认所有用户可见文本为中文
- [ ] 8.2 检查 UI 布局：中文字符宽度是否导致溢出或截断，必要时微调样式