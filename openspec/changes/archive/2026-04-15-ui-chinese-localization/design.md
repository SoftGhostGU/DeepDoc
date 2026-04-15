## Context

当前 web-app 所有用户可见文本为英文硬编码在各组件和 Mock 文件中。项目面向中文评审，需要汉化。不需要 i18n 框架——这是单语言项目，直接替换字符串最简单。

涉及文件扫描结果：
- `components/rag/` 14 个组件，约 40+ 处英文字符串
- `app/(pages)/` 2 个页面，约 6 处英文标题/描述
- `lib/mock/` 2 个文件，stage message + 示例文本
- `app/layout.tsx` 的 lang 和 metadata
- `app/api/` Route Handler 的错误信息（约 10 处，可选）

## Goals / Non-Goals

**Goals:**

- 所有用户在浏览器中看到的文本变为中文
- Mock 数据中的示例文本和 stage 提示变为中文
- HTML lang 属性和 SEO metadata 变为中文

**Non-Goals:**

- 不引入 next-intl、react-i18next 等 i18n 框架
- 不做多语言切换功能
- 不翻译代码注释、变量名、类型名
- API 后端错误信息（JSON error field）可以保留英文——这些不直接展示给用户

## Decisions

### 1. 方式：直接替换硬编码字符串

**选择**: 逐文件将英文字符串替换为中文
**替代方案**: 引入 i18n 框架集中管理翻译
**理由**: 项目只需要中文，不需要多语言切换。i18n 框架引入额外复杂度（Provider、key 管理、json 文件），得不偿失。直接替换最快、最不容易出错。

### 2. Mock 数据也汉化

**选择**: 把 mock 示例文本（文档树标题、段落内容、mock 回答）换成中文
**理由**: 演示时看到英文 mock 内容会很突兀。用符合 DeepDoc 场景的中文示例（如"第一章 问题定义"、"层级检索通过两步缩窄上下文..."）更贴合。

### 3. Stage message 汉化

**选择**: `stage-indicator.tsx` 和 `lib/mock/sse.ts` 中的 stage message 全部改为中文
**理由**: 这些是用户最直接看到的处理状态文本。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 中文字符宽度可能撑破某些 UI 布局 | 汉化后检查各组件视觉效果，必要时调整 padding/width |
| 后续联调时真实 Python 服务返回英文 stage message | Python 侧的 message 由 B 控制，联调时可协商；前端 stage indicator 用自己的映射表，不依赖服务端 message |
