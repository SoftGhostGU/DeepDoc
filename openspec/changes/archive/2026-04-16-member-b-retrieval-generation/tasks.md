# 成员 B 任务清单 — 检索与生成线

> 负责模块: `rag-service/app/retrieval/` + `rag-service/app/generation/` + 相关 API
> 依赖: 成员 A 的解析/索引基础设施 (`parsing/`, `indexing/`, `services/embedding.py`)
> 对接: 成员 C 的前端 SSE 消费 (`chat-store.ts` 事件格式)

---

## Phase 1: 环境与依赖准备 (Day 1)

### 1.1 补充 Python 依赖
- [x] 在 `pyproject.toml` 中添加 `rank-bm25>=0.2.2`（BM25 稀疏检索）
- [x] 在 `pyproject.toml` 中添加 `qdrant-client>=1.12.0`（向量库客户端）
- [x] 在 `pyproject.toml` 中添加 `jieba>=0.42.1`（中文分词，BM25 需要）
- [x] 运行 `uv sync` 验证依赖安装成功

### 1.2 创建模块目录结构
- [x] 创建 `app/retrieval/__init__.py`
- [x] 创建 `app/retrieval/base.py` — 检索器抽象基类
- [x] 创建 `app/generation/__init__.py`
- [x] 创建 `app/rewriting/__init__.py`
- [x] 创建 `app/scoring/__init__.py`

### 1.3 了解 A 的基础设施
- [x] 阅读 `app/services/embedding.py` — 理解 `EmbeddingService` 接口（`encode()`, `encode_one()`, `get_dimension()`）
- [x] 阅读 `app/indexing/builder.py` — 理解 Qdrant collection schema、payload 字段
- [x] 阅读 `app/core/database.py` — 理解 `get_chunks()`, `get_sections()`, `get_document()` 查询接口
- [x] 阅读 `app/models/retrieval.py` — 理解已有的 `SearchPathStep`, `RetrievalPath` 等数据模型
- [x] 与 A 确认 Qdrant collection 名称规则和 payload 格式

---

## Phase 2: 密集检索 + 稀疏检索 (Day 2-3)

### 2.1 密集检索器 (Dense Retriever)
- [x] 实现 `app/retrieval/dense_retriever.py`
- [x] `DenseRetriever` 类，构造时注入 `EmbeddingService` 和 Qdrant client
- [x] `search(query, doc_id, top_k, chunk_type)` 方法：
  - 调用 `EmbeddingService.encode_one(query)` 得到查询向量
  - 调用 Qdrant `search()` 在指定 collection 中检索
  - 按 `doc_id` 和 `chunk_type` (section/paragraph) 过滤
  - 返回 `list[RetrievalResult]`（chunk_id, content, score, metadata）

### 2.2 稀疏检索器 (Sparse Retriever / BM25)
- [x] 实现 `app/retrieval/sparse_retriever.py`
- [x] `SparseRetriever` 类，使用 `rank_bm25.BM25Okapi`
- [x] `build_index(doc_id, chunk_type)` 方法：
- [x] `search(query, doc_id, top_k, chunk_type)` 方法：
- [x] BM25 索引缓存（按 doc_id + chunk_type 缓存，避免重复构建）

### 2.3 检索结果数据模型
- [x] 在 `app/models/retrieval.py` 中新增 `RetrievalResult` 模型：
- [x] 新增 `RetrievalRequest` 模型（给 `/api/retrieve` 用）
- [x] 新增 `RetrievalResponse` 模型

---

## Phase 3: 融合与重排 (Day 4-5)

### 3.1 RRF 融合
- [x] 实现 `app/retrieval/fusion.py`
- [x] `rrf_fuse(result_lists, k=60)` 函数：
  - 输入：多路检索结果 `list[list[RetrievalResult]]`
  - 倒数排名融合公式：`score = Σ 1/(k + rank_i)`
  - 按 chunk_id 合并去重
  - 返回融合后排序列表

### 3.2 重排器 (Reranker)
- [x] 实现 `app/retrieval/reranker.py`
- [x] `Reranker` 类，支持两种模式：
- [x] `rerank(query, results, top_k)` 方法：
- [x] 模型懒加载 + 单例模式（避免重复加载）

### 3.3 单元测试
- [x] 编写 `tests/test_dense_retriever.py` — Mock Qdrant 测试
- [x] 编写 `tests/test_sparse_retriever.py` — 中文 BM25 测试
- [x] 编写 `tests/test_fusion.py` — RRF 融合正确性测试

---

## Phase 4: 两阶段层级检索 (Day 6-8)

### 4.1 层级检索器
- [x] 实现 `app/retrieval/hierarchical.py`
- [x] `HierarchicalRetriever` 类：
- [x] `_retrieve_sections()` — Dense + Sparse → RRF，在 section-level chunks 上检索
- [x] `_retrieve_paragraphs()` — Dense + Sparse → RRF，在段落 chunks 上检索，添加 section_id 过滤
- [x] `_build_path()` — 构建 `RetrievalPath` 对象（节点+边+分数），供前端可视化

### 4.2 朴素检索器
- [x] 实现 `app/retrieval/naive.py`
- [x] `NaiveRetriever` 类：
  - 直接在全部段落 chunks 上 Dense + Sparse → RRF → Rerank
  - 不分层级，一步到位
  - 与 `HierarchicalRetriever` 实现相同接口

### 4.3 检索接口
- [x] 实现 `app/api/retrieval.py` — `POST /api/retrieve`
- [x] 在 `app/main.py` 中注册路由

---

## Phase 5: 流式答案生成 (Day 9-11)

### 5.1 LLM 生成器
- [x] 实现 `app/generation/generator.py`
- [x] `Generator` 类：
- [x] 配置项：`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`（通过 `app/core/config.py`）

### 5.2 Prompt 模板
- [x] 实现 `app/generation/prompt_templates.py`
- [x] `build_rag_prompt(query, chunks, history)` — 标准 RAG prompt：
- [x] `build_compare_prompt(query, chunks, mode)` — 对比模式 prompt
- [x] 支持中英文切换

### 5.3 引用标注提取
- [x] 实现 `app/generation/citation_extractor.py`
- [x] `extract_citations(answer_text, context_chunks)` → `list[Citation]`
  - 解析 LLM 输出中的 `[1]`, `[2]` 等标记
  - 映射到对应的 chunk，构建 `Citation` 对象
  - 包含 `paragraph_id`, `text`, `path`, `score`

### 5.4 SSE 事件流封装
- [x] 实现 `app/generation/streamer.py`
- [x] `SSEStreamer` 类，**严格按照前端 `chat-store.ts` 的事件格式**：
- [x] `sse_event(event_type, data)` 工具函数，生成标准 SSE 格式字符串

### 5.5 替换 /api/ask 占位实现
- [x] 创建 `app/api/ask.py` — 真实 `/api/ask` 路由
- [x] 接收请求体：`{ doc_id, query, mode, history, rewrite_options }`
- [x] 支持 `doc_ids: list[str]`（多文档场景，对接 C 的多文档前端）
- [x] 调用 `SSEStreamer.stream_response()` 返回 `StreamingResponse`
- [x] 在 `app/main.py` 中替换旧路由注册
- [x] 验证：`curl -N -X POST http://localhost:8000/api/ask -d '{"doc_id":"xxx","query":"test"}'`

---

## Phase 6: SSE 分阶段事件流完善 (Day 12)

### 6.1 事件格式严格对齐
- [x] 逐一比对前端 `web-app/lib/stores/chat-store.ts` 中 `handleSseEvent()` 的解析逻辑
- [x] 确认 `retrieval_summary` 事件中 chunks 字段结构
- [x] 确认 `retrieval_paragraphs` 事件中 paragraphs 字段结构
- [x] 确认 `final` 事件中 citations 字段匹配 `RagCitation` 类型
- [x] 确认 `final` 事件中 retrieval_path 字段匹配前端 `RetrievalFlow` 渲染
- [x] 确保检索路径包含：节点 ID、标题、层级、分数、匹配类型
- [x] 确保节点之间有边关系（parent → child 的检索跳转）
- [x] 输出格式兼容前端 `retrieval-flow.tsx` 的 React Flow 节点/边数据

### 6.3 错误处理
- [x] LLM API 调用失败 → 发送 `event: error` + 友好错误消息
- [x] 检索无结果 → 仍然生成答案（带"未找到相关内容"提示）
- [x] SSE 连接中断 → 优雅关闭（不留僵尸连接）

---

## Phase 7: 对比模式 + 查询改写 (Day 13-14)

### 7.1 对比模式双引擎
- [x] 创建 `app/api/compare.py` — 替换占位 `/api/compare`
- [x] 接收：`{ doc_id, query }`
- [x] 使用 `asyncio.gather()` 并行启动朴素和层级两条管线
- [x] 两路各自发送 SSE 事件，使用 `compare_track` 事件区分：
  ```python
  yield sse_event("compare_track", {"track": "naive", "stage": "retrieving", ...})
  yield sse_event("compare_track", {"track": "hierarchical", "stage": "retrieving", ...})
  ```
- [x] 最终各自发送完整答案 + 引用
- [x] 在 `app/main.py` 中替换旧路由注册

### 7.2 HyDE 查询改写
- [x] 实现 `app/rewriting/hyde.py`
- [x] `HyDERewriter` 类：
  - 调用 LLM 生成假设性答案
  - 用假设答案的 embedding 替代原始 query embedding
  - 返回改写后的 query vector

### 7.3 多查询改写
- [x] 实现 `app/rewriting/multi_query.py`
- [x] `MultiQueryRewriter` 类：
  - 调用 LLM 生成 3-5 个不同角度的子查询
  - 对每个子查询分别检索
  - 结果通过 RRF 融合

### 7.4 改写集成
- [x] 在 `/api/ask` 请求体中支持 `rewrite_options: { enable_hyde, multi_query }`
- [x] 在 `SSEStreamer` 中根据选项启用改写阶段

---

## Phase 8: 高级功能 (Day 15-16)

### 8.1 引用可信度评分
- [x] 实现 `app/scoring/credibility.py`
- [x] `CredibilityScorer` 类：
  - 输入：检索分数 + LLM 生成的答案 + 引用片段
  - 算法：`credibility = w1 * retrieval_score + w2 * answer_consistency`
    - `retrieval_score`: Rerank 归一化分数
    - `answer_consistency`: 引用文本与答案的语义相似度
  - 输出：每条引用的 `score` 字段 (0.0 ~ 1.0)
- [x] 权重可配置（`CREDIBILITY_RETRIEVAL_WEIGHT`, `CREDIBILITY_CONSISTENCY_WEIGHT`）

### 8.2 多文档联合检索
- [x] 实现 `app/retrieval/multi_doc.py`
- [x] `MultiDocRetriever` 类：
  - 接收 `doc_ids: list[str]`
  - 对每个 doc_id 分别检索 → 结果合并
  - 跨文档 RRF 融合 + Rerank
  - 结果中标注 `documentId` 和 `documentName`
- [x] 在 `/api/ask` 中根据 `doc_ids` 数组长度自动切换单文档/多文档模式
- [x] 在引用中填充 `documentId` 和 `documentName` 字段

### 8.3 推荐问题接口
- [x] 实现 `POST /api/suggest` — 推荐问题接口
  - 接收 `doc_id`
  - 基于文档摘要/章节标题生成 3-5 个推荐问题
  - 可以用 LLM 生成或基于关键词提取

---

## Phase 9: 集成与联调 (Day 17-18)

### 9.1 与 A 联调
- [x] 验证 Qdrant 检索能正确查到 A 索引的文档
- [x] 验证 section-level 和 paragraph-level chunks 都能检索到
- [x] 验证 `EmbeddingService` 在 B 的模块中正常工作

### 9.2 与 C 联调
- [x] 启动完整 docker-compose（web + rag + qdrant）
- [x] 前端上传文档 → 解析 → 索引 → 问答，验证端到端流程
- [x] 验证前端 6 个 tab 全部正确渲染（思考时间轴、思维导图、检索路径、热力图、对比、性能面板）
- [x] 验证多文档问答场景
- [x] 验证前端引用面板的引用数据正确

### 9.3 Docker Compose 更新
- [x] 更新 `docker-compose.yml` 中 rag 服务的 command，使用 `app/main.py` 而非 `app/api/routes.py`
- [x] 确保 rag 服务安装所有新增依赖
- [x] 验证三服务一键启动正常

### 9.4 性能优化
- [x] BM25 索引缓存（避免每次查询重建）
- [x] Embedding 批处理（合并多个 query 的 encode 请求）
- [x] LLM 流式响应的 buffer 优化
- [x] 添加检索耗时日志（每个阶段计时）

---

## 进度统计

| Phase | 任务数 | 说明 |
|-------|--------|------|
| Phase 1 | 10 | 环境准备 |
| Phase 2 | 9 | Dense + Sparse 检索 |
| Phase 3 | 6 | RRF 融合 + Rerank |
| Phase 4 | 8 | 层级检索 + 朴素检索 + 接口 |
| Phase 5 | 12 | 流式生成 + SSE + /api/ask |
| Phase 6 | 8 | 事件对齐 + 错误处理 |
| Phase 7 | 8 | 对比模式 + 查询改写 |
| Phase 8 | 7 | 可信度 + 多文档 + 推荐问题 |
| Phase 9 | 8 | 集成联调 + Docker + 优化 |
| **总计** | **76** | |
