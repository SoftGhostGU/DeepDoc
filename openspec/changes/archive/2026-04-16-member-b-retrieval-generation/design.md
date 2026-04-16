## Architecture

```
rag-service/app/
├── retrieval/                    # B 负责 - 检索层
│   ├── __init__.py
│   ├── base.py                   # RetrieverBase 抽象基类
│   ├── dense_retriever.py        # Qdrant 向量检索
│   ├── sparse_retriever.py       # BM25 稀疏检索
│   ├── fusion.py                 # RRF 融合
│   ├── reranker.py               # cross-encoder 重排
│   ├── hierarchical.py           # 两阶段层级检索（摘要→段落）
│   ├── naive.py                  # 朴素 RAG baseline
│   └── multi_doc.py              # 多文档联合检索
├── generation/                   # B 负责 - 生成层
│   ├── __init__.py
│   ├── generator.py              # LLM 答案生成器
│   ├── streamer.py               # SSE 事件流封装
│   ├── prompt_templates.py       # Prompt 模板管理
│   └── citation_extractor.py     # 引用标注提取
├── rewriting/                    # B 负责 - 查询改写
│   ├── __init__.py
│   ├── hyde.py                   # HyDE 改写
│   └── multi_query.py            # 多查询生成
├── scoring/                      # B 负责 - 评分
│   ├── __init__.py
│   └── credibility.py            # 可信度评分
├── api/                          # B 修改 - 接口层
│   ├── retrieval.py              # POST /api/retrieve (新增)
│   ├── ask.py                    # POST /api/ask (替换占位)
│   └── compare.py                # POST /api/compare (替换占位)
└── models/
    └── retrieval.py              # 已有，需扩展检索/生成相关模型
```

## Key Design Decisions

### 1. 复用 A 的基础设施

B 不需要重新实现 Embedding 或向量存储，直接复用：
- `app/services/embedding.py` → `EmbeddingService` 单例（支持本地 bge + 远程智谱 API）
- `app/services/vector_store.py` → Qdrant 连接（需要 A 补充查询方法）
- `app/indexing/builder.py` → 了解 collection schema 和 payload 格式
- `app/core/database.py` → `get_chunks()`, `get_sections()` 获取元数据

### 2. SSE 事件格式（必须与前端对齐）

前端 `chat-store.ts` 解析的事件类型：

```
event: stage
data: {"event":"stage","data":{"stage":"analyzing","message":"..."}}

event: token
data: {"event":"token","data":{"stage":"generating","token":"..."}}

event: retrieval_summary
data: {"event":"retrieval_summary","data":{"chunks":[...]}}

event: retrieval_paragraphs
data: {"event":"retrieval_paragraphs","data":{"paragraphs":[...]}}

event: final
data: {"event":"final","data":{"answer":"...","citations":[...],"retrieval_path":[...]}}

event: error
data: {"event":"error","data":{"message":"..."}}
```

### 3. 检索管线流程

```
用户查询
  │
  ├─ [P1] 查询改写 (HyDE / 多查询)
  │
  ├─ 层级检索模式 ─────────────────────────────────────┐
  │   ├─ Stage 1: 摘要层检索 (Dense+Sparse → RRF)      │
  │   ├─ 筛选 top-k 章节                                │
  │   ├─ Stage 2: 段落层检索 (在候选章节内 Dense+Sparse)│
  │   └─ Rerank → 最终段落                              │
  │                                                      │
  ├─ 朴素检索模式 ─────────────────────────────────────┐│
  │   ├─ 全文 Dense+Sparse → RRF                       ││
  │   └─ Rerank → 最终段落                              ││
  │                                                      ││
  ├─ 上下文组装 + Prompt 构建 ◄──────────────────────────┘│
  │                                                       │
  ├─ LLM 流式生成 + 引用标注                              │
  │                                                       │
  └─ [P2] 可信度评分                                      │
      │                                                   │
      └─ SSE 输出 ◄──────────────────────────────────────┘
```

### 4. 对比模式

`/api/compare` 同时启动朴素和层级两条管线（asyncio 并行），各自独立 SSE 输出：
- `event: compare_track` + `data.track: "naive"/"hierarchical"`
- 两路各自包含 stage 事件和最终答案

### 5. 引用数据结构

生成层输出的引用格式必须匹配前端 `RagCitation`：
```python
class Citation(BaseModel):
    id: int                          # 引用序号
    paragraph_id: str                # 段落 ID
    text: str                        # 引用文本片段
    path: list[str]                  # 章节路径 ["第1章", "1.2节", ...]
    score: float                     # 相关性分数 0-1
    documentId: str | None = None    # 多文档时的文档 ID
    documentName: str | None = None  # 多文档时的文档名
```

### 6. 依赖补充

`pyproject.toml` 需要新增：
```toml
"rank-bm25>=0.2.2",
"qdrant-client>=1.12.0",
"jieba>=0.42.1",
```

## Data Flow

### A → B 的数据接口

| A 提供 | B 使用方式 |
|--------|-----------|
| `EmbeddingService.encode()` | Dense retriever 将 query 向量化 |
| Qdrant collection (section chunks) | Stage 1 摘要层检索 |
| Qdrant collection (paragraph chunks) | Stage 2 段落层检索 |
| `get_sections(doc_id)` | 获取章节元数据，构建检索路径 |
| `get_chunks(doc_id, chunk_type)` | 获取段落文本，用于 BM25 索引构建 |

### B → C 的数据接口

| B 提供 | C 使用方式 |
|--------|-----------|
| SSE event: `stage` | `thought-timeline.tsx` 思考过程展示 |
| SSE event: `token` | `chat-message.tsx` 流式答案渲染 |
| SSE event: `retrieval_summary` | `mindmap-viewer.tsx` 章节命中高亮 |
| SSE event: `retrieval_paragraphs` | `document-heatmap.tsx` 段落热力图 |
| SSE event: `final` (citations) | `citation-panel.tsx` 引用面板 |
| SSE event: `final` (retrieval_path) | `retrieval-flow.tsx` 检索路径可视化 |
| `/api/retrieve` response | 独立检索调试（前端暂未使用） |
