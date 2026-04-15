## MODIFIED Requirements

### Requirement: HTML 语言属性和 Metadata 为中文
`layout.tsx` 的 `<html lang>` SHALL 为 `zh-CN`，metadata 的 title SHALL 为 "DeepDoc"，description SHALL 为中文描述。

**Modification**: Update to ensure Chinese text renders optimally with new Space Grotesk + Chinese fallback font stack.

#### Scenario: 页面语言标记
- **WHEN** 浏览器加载页面
- **THEN** HTML 根元素的 lang 属性 SHALL 为 `zh-CN`
- **AND** 字体族 SHALL 优先使用 Space Grotesk 配合系统中文字体回退

#### Scenario: 浏览器标签标题
- **WHEN** 查看浏览器标签页
- **THEN** 标题 SHALL 显示 "DeepDoc"，描述 SHALL 为中文
- **AND** 标题字体 SHALL 使用 Space Grotesk 确保品牌一致性

### Requirement: 文档管理页面文本汉化
文档管理相关的所有用户可见文本 SHALL 为中文。

**Modification**: Ensure Chinese text maintains excellent readability with deep-sea theme colors and new typography.

#### Scenario: 页面标题和描述
- **WHEN** 用户打开文档管理页面
- **THEN** 标题 SHALL 显示"文档管理"，描述 SHALL 为中文（如"上传源文件，打开已索引文档进入问答工作区"）
- **AND** 中文文本 SHALL 使用 `#f0f9ff` 颜色确保在深色背景上的可读性
- **AND** 行高 SHALL 为 1.8 适应中文阅读

#### Scenario: 上传组件文本
- **WHEN** 用户查看上传区域
- **THEN** SHALL 显示"上传文档"作为标题、"拖拽文件到此处"、"支持 PDF、Markdown 和文本文件"、"上传文件"按钮文字、"上传中..."进度提示
- **AND** 中文文本 SHALL 清晰可辨，与 JetBrains Mono 技术元素形成视觉层次

#### Scenario: 文件验证错误
- **WHEN** 用户选择不支持的文件类型
- **THEN** 错误信息 SHALL 为中文（如"不支持的文件类型，支持格式：PDF、MD、TXT"）
- **AND** 错误文本 SHALL 使用 rose 颜色 (`#f43f5e`) 保持可读性

#### Scenario: 文档列表状态
- **WHEN** 文档列表显示文档状态
- **THEN** 状态标签 SHALL 为中文：上传中、解析中、已索引、失败
- **AND** 中文标签 SHALL 在新字体和发光效果下清晰可读

#### Scenario: 空态提示
- **WHEN** 没有任何文档
- **THEN** SHALL 显示"暂无文档"和中文引导提示
- **AND** 空态文本 SHALL 使用 secondary 颜色 (`#94a3b8`) 在深色卡片上清晰显示

#### Scenario: 删除确认
- **WHEN** 用户点击删除按钮
- **THEN** 确认对话框 SHALL 使用中文标题和按钮（"删除文档？"、"删除"、"删除中..."）
- **AND** 中文按钮文字 SHALL 与英文界面元素保持视觉协调

### Requirement: 问答界面文本汉化
问答界面所有用户可见文本 SHALL 为中文。

**Modification**: Ensure Chinese chat interface is readable and aesthetically pleasing in dark theme.

#### Scenario: 对话标题
- **WHEN** 用户在问答页面
- **THEN** 标题 SHALL 显示"问答工作区"，文档名行 SHALL 为"文档：xxx"
- **AND** 中文字体 SHALL 与 Space Grotesk 标题和谐搭配

#### Scenario: 输入框提示
- **WHEN** 输入框为空
- **THEN** placeholder SHALL 为中文（如"输入关于此文档的问题..."）
- **AND** placeholder 颜色 SHALL 使用 muted 色 (`#64748b`) 在深色输入框中

#### Scenario: 输入提示
- **WHEN** 查看输入框下方提示
- **THEN** SHALL 显示"按 Enter 发送，Shift+Enter 换行"
- **AND** 小号中文字体 SHALL 清晰可读

#### Scenario: 空对话提示
- **WHEN** 对话尚未开始
- **THEN** SHALL 显示中文引导（如"开始向文档提问吧"）
- **AND** 提示文本 SHALL 在深色调背景下清晰可见

#### Scenario: 流式错误提示
- **WHEN** SSE 流中断
- **THEN** 错误提示和"关闭"按钮 SHALL 为中文
- **AND** 错误面板 SHALL 使用 rose 背景色保持中文可读性

### Requirement: 引用面板文本汉化
引用相关的所有用户可见文本 SHALL 为中文。

**Modification**: Ensure citation panel Chinese text works with new glow effects and card styling.

#### Scenario: 面板标题
- **WHEN** 查看引用面板
- **THEN** 标题 SHALL 为"引用来源"
- **AND** 标题 SHALL 使用 cyan 色 (`#00d4ff`) 作为强调

#### Scenario: 无引用提示
- **WHEN** 当前消息无引用
- **THEN** SHALL 显示"暂无引用"
- **AND** 提示 SHALL 在空状态下优雅居中

#### Scenario: 引用分数标签
- **WHEN** 查看某条引用
- **THEN** 分数标签 SHALL 为"相关度 XX%"
- **AND** 百分比数字 SHALL 使用 JetBrains Mono 增强技术感

#### Scenario: 查看上下文按钮
- **WHEN** 用户查看引用详情
- **THEN** 按钮 SHALL 显示"查看上下文"
- **AND** 按钮 hover 时 SHALL 有 cyan 发光效果

#### Scenario: 引用摘要
- **WHEN** assistant 消息带有引用
- **THEN** 底部摘要 SHALL 显示"基于 N 个来源"
- **AND** 中文摘要 SHALL 与引用标记视觉协调

#### Scenario: 行内引用标签
- **WHEN** 消息中有行内引用
- **THEN** 提示文字 SHALL 为"行内引用："
- **AND** 标签 SHALL 使用 small 字号并清晰可读

#### Scenario: 上下文视图标题
- **WHEN** 用户打开某引用的上下文视图
- **THEN** 标题 SHALL 为"上下文视图"
- **AND** 标题 SHALL 与路径 breadcrumb 视觉层次分明

### Requirement: 会话侧边栏文本汉化
会话管理相关文本 SHALL 为中文。

**Modification**: Ensure session sidebar Chinese text is legible in narrow dark sidebar.

#### Scenario: 侧边栏标题
- **WHEN** 查看会话侧边栏
- **THEN** 标题 SHALL 为"对话记录"
- **AND** 标题 SHALL 在深色侧边栏背景上清晰可见

#### Scenario: 新建会话
- **WHEN** 用户新建对话
- **THEN** 默认标题 SHALL 为"新对话"，无标题时显示"未命名对话"
- **AND** 会话标题 hover 时 SHALL 有 subtle highlight

### Requirement: 导航侧边栏文本汉化
应用导航侧边栏文本 SHALL 为中文。

**Modification**: Ensure navigation sidebar works with new dark theme.

#### Scenario: 文档链接
- **WHEN** 查看侧边栏导航
- **THEN** SHALL 显示"文档库"而非"Documents"
- **AND** 当前选中项 SHALL 有 cyan glow indicator

#### Scenario: 刷新按钮
- **WHEN** 查看刷新按钮的 aria-label
- **THEN** SHALL 为"刷新文档列表"
- **AND** 按钮 hover 时 SHALL 有发光效果

### Requirement: Stage indicator 文本汉化
RAG 处理阶段的状态提示文本 SHALL 为中文。

**Modification**: Ensure stage indicator Chinese text works with flowing animation.

#### Scenario: 各阶段提示
- **WHEN** SSE 流式处理中
- **THEN** 阶段提示 SHALL 为中文：分析查询意图...、改写查询...、检索摘要候选...、检索源段落...、生成回答...
- **AND** 中文阶段文本 SHALL 与动画效果同步流畅
- **AND** 已完成阶段 SHALL 显示 cyan 色勾选标记

### Requirement: Mock 数据汉化
Mock 数据中的示例文本 SHALL 为中文，以便演示效果更贴合场景。

**Modification**: Ensure mock Chinese data looks good with new monospace fonts.

#### Scenario: Mock 文档树
- **WHEN** 查看 Mock 模式下的文档结构
- **THEN** 节点标题和摘要 SHALL 为中文（如"第一章 问题定义"、"第二章 系统设计"）
- **AND** 中文标题 SHALL 在技术风格界面中自然呈现

#### Scenario: Mock 段落
- **WHEN** 查看 Mock 检索到的段落
- **THEN** 段落文本 SHALL 为中文
- **AND** 段落文字 SHALL 在引用卡片中优雅排版

#### Scenario: Mock 回答
- **WHEN** Mock 流式生成回答
- **THEN** 回答文本 SHALL 为中文
- **AND** 中文回答 SHALL 在深色聊天泡泡中可读性强

#### Scenario: Mock SSE stage message
- **WHEN** Mock SSE 流发送阶段消息
- **THEN** message 字段 SHALL 为中文（如"正在分析查询意图..."）
- **AND** 阶段消息 SHALL 与 loading 动画同步
