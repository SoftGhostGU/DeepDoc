## Why

成员 A 的数据与索引线（parsing / indexing / tree / paragraphs 接口）和成员 C 的 Next.js 全栈应用（前端 UI + Route Handlers 代理层 + Mock Server）已基本完成。**成员 B 是整条 RAG 管线真正"能用"的关键**——没有 B 的检索与生成模块，系统只能跑 Mock 数据，无法对接真实 LLM 和向量检索。

当前状态：
- `rag-service/app/retrieval/` 和 `rag-service/app/generation/` 两个核心目录 **完全不存在**
- `app/api/routes.py` 中 `/api/ask` 和 `/api/compare` 仅返回硬编码占位数据
- A 已完成：文档解析（PDF/MD/TXT）、多粒度索引构建、章节树接口、段落列表接口、Embedding 服务、Qdrant 向量存储
- C 已完成：完整前端 UI（聊天、可视化、多文档）、SSE 消费、Mock Server、所有代理路由
- `pyproject.toml` 已包含 `sentence-transformers`、`torch`、`httpx` 等依赖，但缺少 `rank_bm25`、`qdrant-client` 等检索必需包

## What Changes

成员 B 需要实现 Python RAG 服务的 **检索层 + 生成层**，从 P0 到 P2 共 8 个阶段：

### P0 - 核心检索与生成
- **混合检索引擎**：Dense (Qdrant) + Sparse (BM25) + RRF 融合 + Rerank
- **两阶段层级检索**：摘要层 → 段落层，利用 A 已建好的多粒度索引
- **朴素 RAG baseline**：直接全文检索，与层级检索形成对比
- **流式答案生成**：集成 LLM API (DeepSeek)，SSE 流式输出 + 引用标注
- **接口实现**：`/api/retrieve`、`/api/ask`（替换占位）、`/api/compare`（替换占位）

### P1 - 增强检索
- **SSE 分阶段事件流**：analyzing → rewriting → retrieving_summary → retrieving_paragraphs → generating
- **检索路径结构化输出**：节点 + 边 + 分数，对接前端 React Flow 可视化
- **查询改写**：HyDE + 多查询并行
- **对比模式双引擎**：朴素 vs 层级并行 SSE

### P2 - 高级功能
- **引用可信度评分**：基于检索相关性 + 生成一致性的置信度算法
- **多文档联合检索**：跨文档检索 + 结果去重排序，对接 C 已完成的多文档 UI

## Capabilities

### New Capabilities

- `dense-retriever`: Qdrant 向量相似度检索，复用 A 的 EmbeddingService 和向量索引
- `sparse-retriever`: BM25 稀疏检索，中文分词 + 倒排索引
- `rrf-fusion`: 倒数排名融合 (Reciprocal Rank Fusion)，多路检索结果合并
- `reranker`: bge-reranker-v2-m3 cross-encoder 重排
- `hierarchical-retrieval`: 两阶段层级检索（摘要层筛选 → 段落层精细匹配）
- `naive-retrieval`: 朴素 RAG baseline（直接全文向量检索）
- `llm-generator`: LLM 答案生成器，支持 DeepSeek/MiniMax API，流式输出
- `sse-streamer`: SSE 事件流封装，支持分阶段事件 + token 级流式
- `query-rewriter`: HyDE + 多查询改写
- `credibility-scorer`: 引用可信度评分算法
- `multi-doc-retrieval`: 跨文档联合检索

### Modified Capabilities

- `api-ask`: 将 `app/api/routes.py` 中的占位 `/api/ask` 替换为真实检索+生成管线
- `api-compare`: 将占位 `/api/compare` 替换为朴素 vs 层级双引擎并行
- `pyproject-deps`: 补充 `rank_bm25`、`qdrant-client`、`jieba` 等检索依赖

## Risks

| 风险 | 应对 |
|------|------|
| Qdrant 连接 / 索引格式不匹配 | 先用 A 已有的 `vector_store.py` 适配，保持 collection schema 一致 |
| 重排模型加载慢 / 内存占用大 | 先用 API 调用替代本地推理，或 ONNX 优化 |
| LLM 生成质量不稳定 | 准备多套 prompt 模板，支持切换 |
| SSE 事件格式与前端不匹配 | 严格按 C 的 `chat-store.ts` 中的事件解析逻辑实现 |
| 多路检索 RRF 融合效果差 | 参数可配置，准备备选融合策略 |
