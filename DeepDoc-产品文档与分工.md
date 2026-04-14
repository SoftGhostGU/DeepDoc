# DeepDoc 产品文档与分工方案 v2

> 面向长文档的可视化层级 RAG 系统课程：智能计算系统设计 | 团队规模：3 人架构：Python RAG 微服务 + Next.js 全栈应用

------

## 一、项目概述

### 1.1 项目定位

**DeepDoc** 是一个面向百页级长文档的智能问答系统,核心特色是**可视化的层级化 RAG 检索**——让用户不仅能得到答案,还能"看见"AI 是如何在文档中思考和检索的。

### 1.2 解决的痛点

- 传统 RAG 在长文档场景下信息丢失严重,全局结构感知弱
- RAG 系统是黑盒,用户不知道答案从哪里来、是否可信
- 朴素分块策略破坏文档语义结构
- 缺乏对检索质量的可视化评估手段

### 1.3 核心价值主张

1. **看得见的检索**:可视化 AI 的思考与检索路径
2. **信得过的答案**:精确到段落的引用溯源 + 可信度评分
3. **撑得起的长文**:层级化索引应对百页级文档
4. **比得出的效果**:内置 baseline 对比模式,效果差异一目了然

------

## 二、系统架构

### 2.1 服务拆分

```
┌───────────────────────────────────────────────────┐
│  浏览器                                             │
└───────────────────┬───────────────────────────────┘
                    │ HTTP / SSE
                    ▼
┌───────────────────────────────────────────────────┐
│  Next.js 应用 (端口 3000)                          │
│  ┌──────────────────┬──────────────────────────┐  │
│  │ 前端 (App Router)│ 后端 (Route Handlers)    │  │
│  │ - 可视化组件     │ - 文件管理               │  │
│  │ - 交互 UI        │ - 会话/历史              │  │
│  │ - 流式渲染       │ - 用户系统(可选)         │  │
│  │                  │ - RAG 服务代理           │  │
│  └──────────────────┴────────────┬─────────────┘  │
└────────────────────────────────────┼──────────────┘
                                    │ HTTP / SSE (内网)
                                    ▼
┌───────────────────────────────────────────────────┐
│  Python RAG 服务 (FastAPI, 端口 8000)             │
│  ┌──────────────────────────────────────────┐    │
│  │ 解析层: PyMuPDF + unstructured           │    │
│  ├──────────────────────────────────────────┤    │
│  │ 索引层: 多粒度 chunking + 摘要生成       │    │
│  ├──────────────────────────────────────────┤    │
│  │ 检索层: Hybrid + Rerank + 改写           │    │
│  ├──────────────────────────────────────────┤    │
│  │ 生成层: LLM 调用 + 引用标注 (流式)       │    │
│  └──────────────────────────────────────────┘    │
└───────────────┬───────────────────┬───────────────┘
                │                   │
                ▼                   ▼
        ┌──────────────┐    ┌──────────────┐
        │  Qdrant      │    │  LLM API     │
        │  (向量库)    │    │  (DeepSeek)  │
        └──────────────┘    └──────────────┘
```

### 2.2 为什么这么拆

| 优势           | 说明                                          |
| -------------- | --------------------------------------------- |
| **职责清晰**   | Python 专注算法,Next.js 专注产品              |
| **独立开发**   | 两个服务完全解耦,三人并行无阻塞               |
| **独立部署**   | Docker 各跑各的,互不影响                      |
| **技术栈最优** | Python 用 AI 生态,Next.js 用 Web 生态,不折中  |
| **接口清晰**   | 强制走 HTTP,不存在"随便调内部函数"的耦合      |
| **便于扩展**   | 未来可替换 RAG 实现,或多前端共用一个 RAG 服务 |

### 2.3 技术栈

#### Python RAG 服务

| 组件       | 选型                       |
| ---------- | -------------------------- |
| Web 框架   | FastAPI + Uvicorn          |
| 文档解析   | PyMuPDF + unstructured     |
| 向量库     | Qdrant (Docker)            |
| Embedding  | bge-large-zh-v1.5          |
| Rerank     | bge-reranker-v2-m3         |
| BM25       | rank_bm25 或 Elasticsearch |
| LLM 客户端 | httpx + SSE                |
| 数据模型   | Pydantic v2                |

#### Next.js 应用

| 组件     | 选型                                |
| -------- | ----------------------------------- |
| 框架     | Next.js 14+ (App Router)            |
| 语言     | TypeScript                          |
| 样式     | TailwindCSS + shadcn/ui             |
| 状态     | Zustand 或 React Context            |
| 可视化   | React Flow + ECharts                |
| HTTP     | fetch + EventSource (SSE)           |
| 数据库   | SQLite (Prisma) - 存会话/文档元数据 |
| 文件存储 | 本地 / 或挂 MinIO                   |

#### 共享

| 组件 | 选型                                        |
| ---- | ------------------------------------------- |
| LLM  | DeepSeek API / Claude API                   |
| 部署 | Docker Compose                              |
| 契约 | OpenAPI (Python 自动生成 → TS 类型自动生成) |

------

## 三、服务边界与接口契约

### 3.1 职责划分

**Python RAG 服务的职责(纯算法/无状态为主)**

- 文档解析(接收文件,返回结构化文档)
- 索引构建(接收结构化文档,构建索引)
- 检索(接收查询,返回检索结果 + 路径)
- 生成(接收查询+上下文,流式返回答案)
- 只管 RAG 本身,不管用户、不管会话、不管 UI

**Next.js 应用的职责(产品/有状态)**

- 用户交互与页面渲染
- 文件上传接收与转发
- 文档元数据管理(SQLite)
- 会话历史管理
- 调用 Python 服务并聚合结果
- SSE 流式转发到前端

### 3.2 核心接口(Python RAG 服务对外暴露)

```
POST /api/documents/parse
  接收: multipart file
  返回: { doc_id, structure_tree, stats }

POST /api/documents/{doc_id}/index
  接收: { strategies: ['hierarchical', 'naive'] }
  返回: { indices: [...], build_time }

GET /api/documents/{doc_id}/tree
  返回: 层级树 JSON(给思维导图用)

GET /api/documents/{doc_id}/paragraphs
  返回: 段落列表 + 坐标(给热力图用)

POST /api/retrieve
  接收: { doc_id, query, mode, options }
  返回: { results, retrieval_path, scores }

POST /api/ask (SSE 流式)
  接收: { doc_id, query, mode, rewrite_options }
  流式返回阶段事件:
    - stage: 'analyzing' | 'rewriting' | 'retrieving_summary'
            | 'retrieving_paragraphs' | 'generating'
    - data: 每阶段的详细内容
    - final: 最终答案 + 引用

POST /api/compare (SSE 流式)
  接收: { doc_id, query }
  同时跑朴素 RAG 和层级 RAG,流式返回两路结果

POST /api/evaluate
  接收: 评估数据集
  返回: 指标报告
```

### 3.3 Next.js 对前端暴露的 API

```
POST /api/upload         → 接收文件,转发给 Python
GET  /api/documents      → 列出所有文档
POST /api/chat           → 代理到 Python /api/ask(SSE 透传)
POST /api/compare        → 代理到 Python /api/compare
GET  /api/history        → 会话历史
```

### 3.4 类型共享机制

- Python 侧用 Pydantic 定义所有请求/响应模型
- FastAPI 自动生成 OpenAPI schema
- Next.js 用 `openapi-typescript` 自动生成 TS 类型
- **一处定义,两端同步**,避免手写类型不一致

------

## 四、需求清单(按优先级)

### 🔴 P0 - 核心必做

#### Python RAG 服务侧

- **P0-1** 文档解析(PDF/MD/TXT → 结构化对象)
- **P0-2** 多粒度索引构建(章节摘要/段落/句子 + BM25)
- **P0-3** 混合检索引擎(dense + sparse + RRF + rerank)
- **P0-4** 两阶段层级检索
- **P0-5** 流式答案生成 + 引用标注
- **P0-6** 朴素 RAG baseline(同接口不同策略)
- **P0-7** FastAPI 接口层(上述所有 HTTP 接口)

#### Next.js 应用侧

- **P0-8** 项目脚手架 + Docker Compose
- **P0-9** 文档上传与管理页面
- **P0-10** 问答主界面(输入 + 流式答案)
- **P0-11** 引用溯源(点击跳转 + 原文高亮)
- **P0-12** Route Handlers 代理层(含 SSE 透传)
- **P0-13** 文档元数据持久化(SQLite)

------

### 🟡 P1 - 重点拓展(决定展示效果)

#### Python 侧

- **P1-1** SSE 分阶段事件流实现
- **P1-2** 检索路径结构化输出(给前端渲染用)
- **P1-3** 查询改写(HyDE + 多查询)
- **P1-4** 对比模式双引擎并行

#### Next.js 侧

- **P1-5** 流式思考过程展示 ⭐
- **P1-6** 文档结构思维导图 ⭐
- **P1-7** 检索路径可视化(React Flow 动画) ⭐
- **P1-8** 文档热力图(缩略图 + 染色) ⭐
- **P1-9** 对比演示模式(分屏) ⭐
- **P1-10** 性能监控面板

------

### 🟢 P2 - 加分功能

#### Python 侧

- **P2-1** 引用可信度评分算法
- **P2-2** 多文档联合检索
- **P2-3** 评估系统(跑数据集出指标)

#### Next.js 侧

- **P2-4** 推荐问题 + 文档导读
- **P2-5** 可信度可视化
- **P2-6** 多文档对比问答 UI
- **P2-7** 多轮对话 UI + 上下文管理
- **P2-8** 答案导出(Markdown)

------

### ⚪ P3 - 锦上添花

- DOCX 支持
- 用户系统
- 移动端适配

------

## 五、团队分工(按服务边界 + 垂直切片)

### 5.1 分工原则

- **三人都能全栈**,但聚焦一条主线
- **A 专注 Python RAG 服务**(算法深度)
- **B 横跨两端**(算法 + 接口 + 可视化后端支撑)
- **C 专注 Next.js 应用**(产品体验)
- 通过 **OpenAPI 契约 + Mock** 实现三人完全并行

------

### 👤 成员 A:Python RAG 服务 - 数据与索引线

**主战场:** Python RAG 服务

**P0 任务:**

- P0-1 文档解析模块(PDF/MD/TXT → 结构化文档)
- P0-2 多粒度索引构建(含章节摘要生成)
- P0-7 中负责:`/parse`, `/index`, `/tree`, `/paragraphs` 接口

**P1 任务:**

- P1-2 检索路径中"索引侧"数据结构(章节层节点信息)
- 配合 C 做 P1-6 思维导图(提供层级树接口)
- 配合 C 做 P1-8 文档热力图(提供段落 + 相关度接口)

**P2 任务:**

- P2-3 评估系统(数据集跑批)

**独立开工保障:**

- 不依赖 B、C,第一天就能开干
- 用本地脚本测试,产出 JSON 样例给 B、C

**交付物:**

- `services/rag/parsing/` 模块
- `services/rag/indexing/` 模块
- 对应的 FastAPI 路由
- 样例数据(供 B、C Mock 用)

------

### 👤 成员 B:Python RAG 服务 - 检索与生成线(兼接口架构师)

**主战场:** Python RAG 服务 + 跨服务接口设计

**P0 任务:**

- P0-3 混合检索引擎
- P0-4 两阶段层级检索
- P0-5 流式答案生成 + 引用
- P0-6 朴素 RAG baseline
- P0-7 中负责:`/retrieve`, `/ask`, `/compare` 接口
- **跨服务职责:** 牵头定义 OpenAPI 契约,保证 A、C 对齐

**P1 任务:**

- P1-1 SSE 分阶段事件流(整条阶段消息的后端实现)
- P1-2 检索路径结构化输出(节点+边+分数)
- P1-3 查询改写
- P1-4 对比模式双引擎

**P2 任务:**

- P2-1 引用可信度评分
- P2-2 多文档联合检索

**独立开工保障:**

- 用 A 提供的 mock 索引数据开发检索
- 用固定 prompt + mock context 测生成
- 不等 C,自己用 curl / Postman 测接口

**交付物:**

- `services/rag/retrieval/` 模块
- `services/rag/generation/` 模块
- 完整 OpenAPI 文档
- SSE 事件规范文档

------

### 👤 成员 C:Next.js 应用 - 产品与可视化线

**主战场:** Next.js 应用(全栈)

**P0 任务:**

- P0-8 项目脚手架 + Docker Compose(两服务一键启)
- P0-9 文档上传与管理页
- P0-10 问答主界面(含基础流式答案渲染)
- P0-11 引用溯源交互
- P0-12 Route Handlers 代理层(核心:SSE 透传)
- P0-13 SQLite + Prisma 持久化
- **跨服务职责:** 搭建 Mock Server(让 A、B 能单独测前端集成)

**P1 任务:**

- P1-5 流式思考过程 UI
- P1-6 文档结构思维导图
- P1-7 检索路径可视化(React Flow)
- P1-8 文档热力图
- P1-9 对比演示分屏 UI
- P1-10 性能监控面板

**P2 任务:**

- P2-4 推荐问题 UI
- P2-5 可信度可视化
- P2-6 多文档对比 UI
- P2-7 多轮对话
- P2-8 导出功能

**独立开工保障:**

- 全程用 Mock API 开发(自己写 Mock Handler)
- Mock 数据基于 OpenAPI 规范
- 前端 UI 完全不依赖 A、B 进度

**交付物:**

- 完整 Next.js 应用
- docker-compose.yml
- Mock Server(后期切换为真实调用)

------

### 5.2 并行开发时间线

```
Day 0 (共同): kickoff + 敲定 OpenAPI 契约 + 数据模型
│
├─ A: 写 mock JSON 样例  ──┐
├─ B: 写 OpenAPI + SSE 事件规范 ──┤
└─ C: 搭 Next.js + Mock Server(基于 B 的 OpenAPI)──┘
       │
   ─── 三人完全并行 P0 ───
       │
   ─── 三人完全并行 P1 ───
       │
   ─── 联调阶段 ───
   C 把 Mock 切成真实 Python 服务调用
   三人一起修集成问题
       │
   ─── 共同完成 P2 ───
       │
   ─── 评估 + 报告 + 答辩 ───
```

### 5.3 并行性保障细节

| 潜在阻塞点                | 解决方案                                                     |
| ------------------------- | ------------------------------------------------------------ |
| B 需要 A 的索引           | A 第一天提供 3-5 份 mock 索引 JSON                           |
| C 需要 B 的接口           | C 自己用 Next.js Route Handler 写 Mock,返回符合 OpenAPI 的假数据 |
| C 需要 A 的文档树         | A 第一天提供 1-2 份示例 tree JSON                            |
| A、B 改同一份 Python 代码 | 按目录严格分工:A 在 `parsing/` + `indexing/`,B 在 `retrieval/` + `generation/` |
| 接口变更影响另外两人      | B 是接口 owner,任何变更需同步 A、C;每周一次接口 review       |
| SSE 调试困难              | B 提前用 `curl -N` 测通,写好示例给 C                         |

------

## 六、目录结构建议

```
deepdoc/
├── docker-compose.yml          # 一键启动两服务+Qdrant
├── README.md
│
├── services/
│   └── rag/                    # Python RAG 服务 (A+B)
│       ├── Dockerfile
│       ├── pyproject.toml
│       ├── app/
│       │   ├── main.py         # FastAPI 入口
│       │   ├── api/            # 路由层
│       │   │   ├── documents.py   # A 负责
│       │   │   ├── retrieval.py   # B 负责
│       │   │   └── ask.py         # B 负责
│       │   ├── parsing/        # A 负责
│       │   ├── indexing/       # A 负责
│       │   ├── retrieval/      # B 负责
│       │   ├── generation/     # B 负责
│       │   ├── models/         # Pydantic 模型(共享)
│       │   └── core/           # 配置、日志等
│       └── tests/
│
├── apps/
│   └── web/                    # Next.js 应用 (C)
│       ├── Dockerfile
│       ├── package.json
│       ├── app/
│       │   ├── (pages)/
│       │   ├── api/            # Route Handlers(代理层)
│       │   └── components/
│       ├── lib/
│       │   ├── rag-client.ts   # Python 服务调用封装
│       │   └── types/          # 从 OpenAPI 自动生成
│       ├── prisma/
│       └── public/
│
├── packages/
│   └── contracts/              # 接口契约(可选)
│       └── openapi.yaml
│
└── docs/
    ├── api.md                  # 接口文档
    ├── architecture.md
    └── dev-guide.md
```

------

## 七、关键交付物

### 7.1 代码

- `docker-compose up` 一键启动完整系统
- Python RAG 服务独立可测(curl / Postman)
- Next.js 应用独立可跑(连 Mock 也能演示)

### 7.2 文档

- 期末报告
- 演示视频
- 答辩 PPT
- 系统架构图

### 7.3 演示

- 本地一键启动的 demo
- 3-5 个典型 demo case

------

## 八、风险与应对

| 风险                         | 应对                              |
| ---------------------------- | --------------------------------- |
| Python 和 Next.js 类型不一致 | OpenAPI 自动生成 TS 类型,禁止手写 |
| SSE 跨服务透传出问题         | B 提前做透传原型,C 提前验证       |
| Qdrant 学习成本              | 备选 Chroma(更轻量,但功能少)      |
| LLM 费用失控                 | 用 DeepSeek + 限流 + 缓存         |
| 文件上传大小超限             | Next.js 直接流式转发,不落盘中转   |
| 本地 embedding 模型慢        | 用 bge-small 备选,或 API 调用     |

------

## 九、下一步行动

1. **Day 0 共同会议**(2 小时):
   - 过一遍本文档
   - B 带头草拟 OpenAPI 契约
   - A 承诺第一批 mock 样例数据
   - C 承诺脚手架 + Mock Server 交付时间
2. **各自启动**:
   - A: 拉分支开始 parsing 模块
   - B: 拉分支完成 OpenAPI + 开始 retrieval
   - C: 拉分支搭脚手架 + Mock Server
3. **每周**:同步会 + 接口 review