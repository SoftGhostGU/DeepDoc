# DeepDoc RAG Service

面向长文档的层级 RAG 系统后端服务。

## 项目概述

DeepDoc 是一个面向百页级长文档的智能问答系统，核心特色是**可视化的层级化 RAG 检索**——让用户不仅能得到答案，还能"看见"AI 是如何在文档中思考和检索的。

## 已完成的功能

### Phase 1: 项目初始化 ✅
- [x] FastAPI 基础框架
- [x] pydantic-settings 配置中心
- [x] loguru 日志模块
- [x] 全局异常处理
- [x] SQLite 数据库（含向量存储）
- [x] 依赖管理 (uv)

### Phase 2: 文档解析模块 ✅
- [x] PDF 解析器 (PyMuPDF)
  - 自动识别章节标题（字体大小 + 加粗 + 模式匹配）
  - 提取段落坐标（热力图定位）
- [x] Markdown 解析器
  - 基于 # 数量还原 H1-H6 层级
- [x] 纯文本解析器
- [x] 解析接口: `POST /api/documents/parse`

### Phase 3: 索引构建模块 ✅
- [x] 分块策略
  - HierarchicalChunker (层级)
  - NaiveChunker (固定长度)
  - SemanticChunker (语义)
- [x] 向量嵌入服务 (Sentence-Transformers)
- [x] SQLite 向量存储 (pickle 序列化)
- [x] 多粒度支持 (detail/summary)
- [x] 索引构建接口: `POST /api/documents/{doc_id}/index`

### Phase 4: 辅助接口模块 ✅
- [x] 层级树接口: `GET /api/documents/{doc_id}/tree`
  - 递归算法将扁平表转为嵌套树
  - 支持前端思维导图
- [x] 段落热力图接口: `GET /api/documents/{doc_id}/paragraphs`
  - 按 page + position 排序
  - 支持分页 (limit/offset)
- [x] 检索路径模型定义
- [x] 可视化数据支撑

### Phase 5: 评估系统 ✅
- [x] 评估数据加载器 (JSON/JSONL/CSV)
- [x] 核心指标算法
  - Hit Rate (命中率)
  - MRR (平均倒数排名)
  - Precision/Recall/F1
  - 路径准确性
- [x] 评估接口: `POST /api/evaluate`
  - 异步 BackgroundTasks
  - 对比模式 (use_hierarchy)
- [x] 评估历史: `GET /api/history/{doc_id}`

## 待完成的功能

### 成员 B (检索与生成线)

- [ ] 检索接口 (`POST /api/retrieve`)
  - 混合检索 (dense + sparse + RRF + rerank)
  - 两阶段层级检索
- [ ] 问答接口 (`POST /api/ask`)
  - SSE 流式返回
  - 分阶段事件流
- [ ] 对比模式接口 (`POST /api/compare`)
  - 朴素 RAG vs 层级 RAG 并行

### 成员 C (Next.js 应用)

- [ ] 项目脚手架 + Docker Compose
- [ ] 文档上传与管理页面
- [ ] 问主治面 (流式答案)
- [ ] 引用溯源交互
- [ ] Route Handlers 代理层 (含 SSE)
- [ ] SQLite + Prisma 持久化
- [ ] 可视化组件
  - 思维导图
  - 热力图
  - 检索路径动画

## 快速开始

### 1. 安装依赖

```bash
cd rag-service
uv sync
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# MiniMax API
LLM_API_KEY="your-api-key"
LLM_BASE_URL="https://api.minimax.chat/v1"
LLM_MODEL="MiniMax-Text-01"
```

### 3. 启动服务

```bash
python main.py
# 或
uvicorn app.main:app --reload --port 8000
```

### 4. 访问

| 服务 | 地址 |
|------|------|
| API | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| 健康检查 | http://localhost:8000/health |

## API 接口文档

### 文档操作

```bash
# 解析文档
curl -X POST "http://localhost:8000/api/documents/parse" \
  -F "file=@your-document.pdf"
```
返回示例：
```json
{
  "doc_id": "abc123",
  "structure_tree": {...},
  "stats": {"pages": 100, "paragraphs": 523}
}
```

```bash
# 构建索引
curl -X POST "http://localhost:8000/api/documents/doc_id/index" \
  -H "Content-Type: application/json" \
  -d '{"strategies": ["hierarchical"]}'
```

```bash
# 获取层级树
curl "http://localhost:8000/api/documents/doc_id/tree"
```

```bash
# 获取段落列表
curl "http://localhost:8000/api/documents/doc_id/paragraphs"
```

### 评估

```bash
# 触发评估（需要先准备评估数据）
curl -X POST "http://localhost:8000/api/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"doc_id": "doc123", "use_hierarchy": true}'
```

```bash
# 查看评估历史
curl "http://localhost:8000/api/history/doc_id"
```

## 项目结构

```
rag-service/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── exceptions.py        # 自定义异常
│   ├── core/               # 核心配置
│   │   ├── config.py        # 配置中心
│   │   ├── logging.py      # 日志
│   │   └── database.py    # SQLite 数据库
│   ├── models/              # 数据模型
│   │   ├── document.py    # 文档结构
│   │   ├── index.py       # 索引模型
│   │   ├── retrieval.py   # 检索模型
│   │   └── response.py   # 响应模型
│   ├── api/                # API 路由
│   │   ├── documents.py   # 文档接口
│   │   └── evaluation.py # 评估接口
│   ├── parsing/             # 文档解析
│   │   ├── base.py
│   │   ├── pdf_parser.py
│   │   ├── md_parser.py
│   │   └── txt_parser.py
│   ├── indexing/           # 索引构建
│   │   ├── chunker.py
│   │   ├── summarizer.py
│   │   └── builder.py
│   ├── services/           # 服务
│   │   └── embedding.py    # 向量嵌入
│   └── evaluation/        # 评估系统
│       ├── loader.py
│       ├── metrics.py
│       └── database.py
├── evaluation/            # 评估数据
├── data/                  # 数据存储
├── uploads/               # 上传文件
├── pyproject.toml
└── main.py
```

## 技术栈

- **Web 框架**: FastAPI + Uvicorn
- **数据模型**: Pydantic v2
- **数据库**: SQLite + aiosqlite
- **文档解析**: PyMuPDF
- **向量**: Sentence-Transformers (bge-large-zh-v1.5)
- **日志**: Loguru

## 评估数据格式

评估样本文件 (`evaluation/samples.jsonl`)：

```json
{"query": "什么是RAG？", "ground_truth_context": "RAG是检索增强生成技术", "ground_truth_section_ids": ["sec_1"], "answer": "RAG是检索增强生成"}
```

## 配置说明

主要配置项 (`.env`)：

```env
# 服务
HOST=0.0.0.0
PORT=8000

# LLM
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.minimax.chat/v1
LLM_MODEL=MiniMax-Text-01

# 向量
EMBEDDING_MODEL=bge-large-zh-v1.5
VECTOR_DIMENSION=1024

# 索引
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

## 团队分工

| 成员 | 职责 |
|------|------|
| A | 解析 + 索引 + 数据库 (已完成) |
| B | 检索 + 生成 + 对比模式 (待完成) |
| C | Next.js 前端 + 可视化 (待完成) |

## 许可证

MIT