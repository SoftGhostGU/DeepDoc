## Why

DeepDoc 是面向中文用户的课程项目（智能计算系统设计），但当前所有 UI 文本均为英文。答辩演示时中文界面更自然，评委理解门槛更低。项目不需要多语言支持，直接将硬编码英文替换为中文即可。

## What Changes

- 将所有前端组件中的英文用户界面文本替换为中文
- 将 Mock SSE 流中的英文 stage message 替换为中文
- 将 Mock 数据中的英文示例文本替换为中文
- 更新 layout.tsx 的 html lang 属性为 `zh-CN`
- 更新 metadata (title, description) 为中文

## Capabilities

### New Capabilities

- `ui-text-chinese`: 全站用户可见文本汉化（组件、页面、Mock 数据、metadata）

### Modified Capabilities

（无——仅文本替换，不改变功能行为）

## Impact

- **组件**: `components/rag/` 下全部 14 个组件中的用户可见字符串
- **页面**: `app/(pages)/` 下的页面标题和描述文字
- **Mock**: `lib/mock/sse.ts` 和 `lib/mock/data.ts` 中的英文示例
- **布局**: `app/layout.tsx` 的 lang 和 metadata
- **API 错误信息**: Route Handler 中的错误提示（可选——后端错误信息对用户不直接可见）
- **无需新增依赖**: 不引入 i18n 框架，直接硬编码中文
