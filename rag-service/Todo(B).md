# 成员B - 检索与生成线开发计划

> 负责模块: 检索与生成线
> 主战场: `rag-service/app/retrieval/` + `rag-service/app/generation/`

---

## 一、任务概览

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 混合检索引擎 | dense + sparse + RRF + rerank |
| P0 | 两阶段层级检索 | 摘要层 → 段落层 |
| P0 | 流式答案生成 | SSE + 引用标注 |
| P0 | 朴素 RAG baseline | 对比基准 |
| P0 | 接口层 | `/retrieve`, `/ask`, `/compare` |
| P1 | SSE 分阶段事件流 | 分析→改写→检索→生成 |
| P1 | 检索路径结构化输出 | 节点+边+分数 |
| P1 | 查询改写 | HyDE + 多查询 |
| P1 | 对比模式双引擎 | 朴素 vs 层级并行 |
| P2 | 引用可信度评分 | 置信度算法 |
| P2 | 多文档联合检索 | 跨文档检索 |

---

## 二、详细任务清单

### Phase 1: 检索基础设施与接口 (Day 1-3)

#### B1.1 检索模块目录结构

```
rag-service/app/
├── retrieval/
│   ├── __init__.py
│   ├── base.py              # 检索策略基类
│   ├── dense_retriever.py   # 向量检索
│   ├── sparse_retriever.py  # BM25检索
│   ├── fusion.py            # RRF融合
│   ├── reranker.py          # 重排模型
│   └── hierarchical.py      # 两阶段层级检索
└── generation/
    ├── __init__.py
    ├── generator.py         # 答案生成器
    └── streamer.py          # SSE流式封装
```

#### B1.2 密集检索 (Dense Retrieval)

- [ ] 实现 `DenseRetriever` 类
- [ ] 使用 A 建好的向量索引
- [ ] 实现余弦相似度计算
- [ ] 支持 top-k 召回

#### B1.3 稀疏检索 (Sparse Retrieval / BM25)

- [ ] 实现 `SparseRetriever` 类
- [ ] 使用 rank_bm25 或 Elasticsearch
- [ ] 文本分词与倒排索引
- [ ] BM25 评分计算

#### B1.4 检索融合 (RRF)

- [ ] 实现倒数排名融合 (Reciprocal Rank Fusion)
- [ ] 多路检索结果合并
- [ ] 参数调优

#### B1.5 重排模型 (Rerank)

- [ ] 集成 bge-reranker-v2-m3
- [ ] 实现 cross-encoder 重排
- [ ] 与 A 的 embedding 模型对接

---

### Phase 2: 两阶段层级检索 (P0-4) (Day 4-6)

#### B2.1 检索接口定义

- [ ] 定义 `POST /api/retrieve` 请求/响应模型
- [ ] 定义检索结果数据结构

#### B2.2 第一阶段：摘要层检索

- [ ] 实现摘要层检索 (`section` chunks)
- [ ] 使用 A 的 `/tree` 接口获取结构
- [ ] 根据 query 匹配相关章节

#### B2.3 第二阶段：段落层检索

- [ ] 实现段落层检索 (`paragraph` chunks)
- [ ] 在相关章节内精细检索
- [ ] 返回带位置信息的段落

#### B2.4 检索路径输出

- [ ] 实现检索路径数据结构
- [ ] 返回节点+边+分数格式
- [ ] 配合前端可视化

---

### Phase 3: 朴素 RAG Baseline (P0-6) (Day 7)

#### B3.1 朴素检索实现

- [ ] 实现 `NaiveRetriever` 类
- [ ] 直接全文检索，不分层级
- [ ] 与层级检索形成对比

#### B3.2 对比模式接口

- [ ] 定义 `POST /api/compare` 请求/响应
- [ ] 同时返回两路检索结果

---

### Phase 4: 流式答案生成 (P0-5) (Day 8-10)

#### B4.1 生成器基础

- [ ] 实现 `Generator` 类
- [ ] 集成 LLM API (MiniMax/DeepSeek)
- [ ] 实现 httpx SSE 客户端

#### B4.2 上下文组装

- [ ] 将检索结果组装为 prompt
- [ ] 实现引用标注注入
- [ ] 支持灵活的 prompt 模板

#### B4.3 流式输出

- [ ] 实现 SSE 流式响应
- [ ] 支持 `text/event-stream` 格式
- [ ] 处理连接断开与错误

#### B4.4 问答接口

- [ ] 定义 `POST /api/ask` 请求/响应模型
- [ ] 实现 SSE 流式端点
- [ ] 超时与重试机制

---

### Phase 5: SSE 分阶段事件流 (P1-1) (Day 11-12)

#### B5.1 阶段定义

定义 SSE 事件阶段:
```python
class RetrievalStage(str, Enum):
    ANALYZING = "analyzing"           # 分析问题
    REWRITING = "rewriting"            # 查询改写
    RETRIEVING_SUMMARY = "retrieving_summary"  # 检索摘要层
    RETRIEVING_PARAGRAPHS = "retrieving_paragraphs"  # 检索段落层
    GENERATING = "generating"          # 生成答案
```

#### B5.2 阶段事件发送

- [ ] 实现阶段切换与事件发送
- [ ] 每阶段返回详细数据
- [ ] 支持前端渲染思考过程

#### B5.3 前端对接

- [ ] 提供 SSE 事件规范文档
- [ ] 给 C 提供 curl 示例

---

### Phase 6: 查询改写 (P1-3) (Day 13)

#### B6.1 HyDE 改写

- [ ] 实现 HyDE (Hypothetical Document Embeddings)
- [ ] 生成假设性答案
- [ ] 用假设答案检索

#### B6.2 多查询改写

- [ ] 实现多角度查询生成
- [ ] 并行检索多路查询
- [ ] 结果融合

---

### Phase 7: 高级功能 (P2) (Day 14-15)

#### B7.1 引用可信度评分

- [ ] 实现可信度评分算法
- [ ] 基于检索相关性 + 生成一致性
- [ ] 返回置信度分数

#### B7.2 多文档联合检索

- [ ] 实现跨文档检索
- [ ] 多 doc_id 支持
- [ ] 检索结果去重与排序

---

### Phase 8: 集成测试与优化 (Day 16)

- [ ] 端到端测试 (上传→索引→检索→生成)
- [ ] 性能优化 (缓存、批处理)
- [ ] 与 A、C 对接联调

---

## 三、核心接口规范

### B3.1 `POST /api/retrieve` - 混合检索

**请求**:
```json
{
  "doc_id": "doc_xxx",
  "query": "RAG的原理是什么？",
  "mode": "hierarchical",  // "hierarchical" | "naive"
  "options": {
    "top_k": 10,
    "rerank": true,
    "use_rewrite": false
  }
}
```

**响应**:
```json
{
  "results": [
    {
      "chunk_id": "xxx",
      "content": "...",
      "score": 0.85,
      "page": 1,
      "section_id": "sec_1"
    }
  ],
  "retrieval_path": {
    "nodes": [...],
    "edges": [...]
  },
  "scores": {
    "dense": 0.9,
    "sparse": 0.7,
    "rerank": 0.85
  }
}
```

### B3.2 `POST /api/ask` - 流式问答 (SSE)

**请求**:
```json
{
  "doc_id": "doc_xxx",
  "query": "RAG的原理是什么？",
  "mode": "hierarchical",
  "rewrite_options": {
    "enable_hyde": false,
    "multi_query": false
  }
}
```

**SSE 事件流**:
```
event: stage
data: {"stage": "analyzing", "data": "正在分析问题..."}

event: stage
data: {"stage": "retrieving_summary", "data": {"chunks_found": 3}}

event: stage
data: {"stage": "retrieving_paragraphs", "data": {"chunks_found": 8}}

event: stage
data: {"stage": "generating", "data": ""}

event: content
data: {"content": "RAG是检索增强生成技术"}

event: citation
data: {"chunk_id": "xxx", "text": "RAG是检索增强生成"}

event: done
data: {"total_chunks": 8, "generation_time": 1.23}
```

### B3.3 `POST /api/compare` - 对比模式 (SSE)

**请求**:
```json
{
  "doc_id": "doc_xxx",
  "query": "RAG的原理是什么？"
}
```

**SSE 事件流**: 同时返回两路结果
```
event: hierarchical
data: {"stage": "retrieving", "results": [...]}

event: naive
data: {"stage": "retrieving", "results": [...]}

event: answer
data: {"mode": "hierarchical", "answer": "..."}

event: answer
data: {"mode": "naive", "answer": "..."}
```

---

## 四、与 A、C 的配合

### 给 A 的支持:
- Day 1: 确认检索接口所需的数据格式
- 及时反馈索引数据结构问题

### 给 C 的支持:
- Day 1: 提供 OpenAPI 契约文档
- Day 5: 提供 SSE 事件规范文档
- 提供 curl 测试示例

---

## 五、交付物清单

| 文件 | 说明 |
|------|------|
| `app/retrieval/` | 检索模块 (dense/sparse/fusion/reranker) |
| `app/generation/` | 生成模块 (generator/streamer) |
| `app/api/retrieval.py` | `/retrieve` 接口 |
| `app/api/ask.py` | `/ask`, `/compare` 接口 |
| `docs/sse-events.md` | SSE 事件规范 |
| `docs/openapi.yaml` | OpenAPI 契约文档 |

---

## 六、依赖关系

```
A 的工作 (索引数据)
    ↓
B1.x (检索基础设施)
    ↓
B2.x (两阶段层级检索) → 产出: /retrieve 接口
    ↓
B3.x (朴素 RAG) → 产出: /compare 接口
    ↓
B4.x (流式生成) → 产出: /ask 接口
    ↓
B5.x (SSE 事件流) → 完善 /ask
    ↓
B6-B7 (高级功能)
    ↓
B8 (集成测试)
```

---

## 七、风险与应对

| 风险 | 应对方案 |
|------|----------|
| 多路检索融合效果差 | 调优 RRF 参数，准备备选融合策略 |
| SSE 跨服务透传问题 | 提前用 curl 测试透传，C 同步验证 |
| LLM 生成质量不稳定 | 准备 prompt 模板调优，准备 fallback |
| 重排模型加载慢 | 使用 ONNX 优化，或 API 调用 |

---

## 八、每日检查点

- [ ] Day 1: 目录结构 + dense/sparse 基础实现
- [ ] Day 2: RRF 融合 + reranker 集成
- [ ] Day 3: `/retrieve` 接口完成
- [ ] Day 4-5: 两阶段检索第一阶段
- [ ] Day 6: 两阶段检索第二阶段 + 路径输出
- [ ] Day 7: 朴素 RAG + `/compare` 接口
- [ ] Day 8-9: 生成器 + LLM 集成
- [ ] Day 10: SSE 流式输出 + `/ask` 接口
- [ ] Day 11-12: SSE 分阶段事件流
- [ ] Day 13: 查询改写 (HyDE + 多查询)
- [ ] Day 14-15: 可信度评分 + 多文档检索
- [ ] Day 16: 集成测试与优化
