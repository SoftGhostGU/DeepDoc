# 成员A - Python RAG 服务开发计划

> 负责模块: 数据与索引线
> 主战场: `rag-service/`

---

## 一、任务概览

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 文档解析模块 | PDF/MD/TXT → 结构化文档 |
| P0 | 多粒度索引构建 | 含章节摘要生成 |
| P0 | FastAPI 接口 | `/parse`, `/index`, `/tree`, `/paragraphs` |
| P1 | 检索路径数据结构 | 章节层节点信息 |
| P1 | 配合思维导图 | 提供层级树接口 |
| P1 | 配合文档热力图 | 提供段落+相关度接口 |
| P2 | 评估系统 | 数据集跑批 |

---

## 二、详细任务清单

### Phase 1: 项目初始化与基础设施 (Day 1-2)

#### T1.1 环境搭建

- [ ] 创建 `rag-service/app/` 目录结构
- [ ] 配置 `pyproject.toml` 依赖（FastAPI, PyMuPDF, unstructured, qdrant-client等）
- [ ] 安装依赖: `uv sync` 或 `pip install -e .`
- [ ] 配置日志模块 `app/core/logging.py`
- [ ] 配置全局异常处理

#### T1.2 目录结构创建

```
rag-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理
│   ├── models/              # Pydantic 数据模型
│   │   ├── document.py      # 文档结构模型
│   │   ├── index.py         # 索引模型
│   │   └── response.py      # 响应模型
│   ├── api/                 # 路由层
│   │   ├── documents.py     # 文档相关接口
│   │   └── __init__.py
│   ├── parsing/             # 解析模块 [A负责]
│   │   ├── __init__.py
│   │   ├── base.py          # 解析器基类
│   │   ├── pdf_parser.py    # PDF解析器
│   │   ├── md_parser.py     # Markdown解析器
│   │   └── txt_parser.py    # TXT解析器
│   ├── indexing/            # 索引模块 [A负责]
│   │   ├── __init__.py
│   │   ├── chunker.py       # 分块策略
│   │   ├── summarizer.py    # 摘要生成
│   │   └── builder.py       # 索引构建器
│   └── core/                # 核心配置
│       ├── __init__.py
│       └── config.py
├── pyproject.toml
└── README.md
```

---

### Phase 2: 文档解析模块 (P0-1) (Day 3-5)

#### T2.1 基础解析器

- [ ] 实现 `ParsingStrategy` 抽象基类
- [ ] 实现 `PDFParser` - 使用 PyMuPDF 提取:
  - 文本内容
  - 段落结构
  - 章节标题（通过标题层级判断）
  - 页码信息
  - 表格/图片位置（可选）
- [ ] 实现 `MarkdownParser` - 解析:
  - 标题层级
  - 代码块
  - 列表
  - 链接
- [ ] 实现 `TextParser` - 简单按段落分割

#### T2.2 文档结构模型

- [ ] 定义 `Document` Pydantic 模型
- [ ] 定义 `Section` 模型（章节）
- [ ] 定义 `Paragraph` 模型（段落）
- [ ] 定义 `DocumentStructure` 模型（树形结构）

#### T2.3 解析接口

- [ ] 实现 `POST /api/documents/parse` 接口
  - 接收: multipart file
  - 返回: `{ doc_id, structure_tree, stats }`
- [ ] 文件格式校验
- [ ] 大文件处理（流式读取）

#### T2.4 测试与样例数据

- [ ] 准备 3-5 份测试文档（PDF/MD/TXT）
- [ ] 编写单元测试
- [ ] 输出 JSON 样例给 B、C 使用

---

### Phase 3: 多粒度索引构建 (P0-2) (Day 6-9)

#### T3.1 分块策略实现

- [ ] 实现 `HierarchicalChunker` 层级分块:
  - 章节级块（按标题切分）
  - 段落级块
  - 句子级块（滑动窗口）
- [ ] 实现 `NaiveChunker` 朴素分块（固定长度）
- [ ] 实现 `SemanticChunker` 语义分块（基于句子边界）

#### T3.2 摘要生成

- [ ] 实现 `SectionSummarizer`:
  - 提取章节关键信息
  - 生成章节摘要（可调用 LLM 或用 extractive 方法）
- [ ] 实现 `DocumentSummary` 文档级摘要

#### T3.3 向量索引构建

- [ ] 配置 Qdrant 连接
- [ ] 实现 `IndexBuilder` 索引构建器:
  - 文档向量化（使用 bge-large-zh-v1.5）
  - Qdrant collection 创建
  - 点数据插入
- [ ] 实现元数据索引（用于 tree/paragraphs 查询）

#### T3.4 索引接口

- [ ] 实现 `POST /api/documents/{doc_id}/index` 接口
  - 接收: `{ strategies: ['hierarchical', 'naive'] }`
  - 返回: `{ indices: [...], build_time }`
- [ ] 索引状态管理（构建中/已完成/失败）

---

### Phase 4: 辅助接口 (P0-7 + P1) (Day 10-12)

#### T4.1 层级树接口

- [ ] 实现 `GET /api/documents/{doc_id}/tree` 接口
- [ ] 返回格式（给思维导图用）:
```json
{
  "tree": {
    "id": "root",
    "title": "文档标题",
    "level": 0,
    "children": [
      {
        "id": "ch1",
        "title": "第一章",
        "level": 1,
        "children": [...]
      }
    ]
  }
}
```

#### T4.2 段落列表接口

- [ ] 实现 `GET /api/documents/{doc_id}/paragraphs` 接口
- [ ] 返回格式（给热力图用）:
```json
{
  "paragraphs": [
    {
      "id": "p1",
      "content": "段落内容...",
      "page": 1,
      "section_id": "ch1",
      "position": 0
    }
  ]
}
```

#### T4.3 检索路径数据结构（P1-2）

- [ ] 定义检索路径数据结构
- [ ] 配合 B 实现章节层节点信息传递

---

### Phase 5: 评估系统 (P2-3) (Day 13-14)

#### T5.1 评估框架

- [ ] 实现评估数据加载器
- [ ] 实现评估指标计算（Precision, Recall, F1）
- [ ] 实现批量评估脚本

#### T5.2 评估接口

- [ ] 实现 `POST /api/evaluate` 接口
  - 接收: 评估数据集
  - 返回: 指标报告

---

### Phase 6: 集成测试与优化 (Day 15-16)

- [ ] 端到端测试（上传文档 → 索引 → 查询）
- [ ] 性能优化（批处理、缓存）
- [ ] Bug 修复

---

## 三、依赖关系

```
T1.x (基础设施)
    ↓
T2.x (解析模块) → 产出: 结构化文档 JSON
    ↓
T3.x (索引模块) → 产出: Qdrant 索引 + 元数据
    ↓
T4.x (辅助接口) → 产出: /tree, /paragraphs 接口
    ↓
T5.x (评估系统)
    ↓
T6.x (集成测试)
```

---

## 四、与 B、C 的配合

### 给 B（检索与生成线）的支持:

- Day 2: 提供 3-5 份 mock 索引 JSON
- 接口对齐: 确保 `/retrieve` 能获取到 A 存储的索引数据

### 给 C（Next.js 应用）的支持:

- Day 2: 提供 1-2 份示例 tree JSON
- 接口对齐: `/tree`, `/paragraphs` 接口格式确认

---

## 五、交付物清单

| 文件 | 说明 |
|------|------|
| `app/parsing/` | 文档解析模块 |
| `app/indexing/` | 索引构建模块 |
| `app/api/documents.py` | FastAPI 路由 |
| `app/models/` | Pydantic 数据模型 |
| `tests/` | 单元测试 |
| `sample_data/` | 样例数据（JSON）|

---

## 六、每日检查点

- [ ] Day 1: 环境搭建完成，目录结构创建
- [ ] Day 2: 输出 mock JSON 样例
- [ ] Day 3-5: 解析模块完成，接口可用
- [ ] Day 6-9: 索引模块完成，Qdrant 可查询
- [ ] Day 10-12: 辅助接口完成
- [ ] Day 13-14: 评估系统完成
- [ ] Day 15-16: 集成测试与优化

---

## 七、风险与应对

| 风险 | 应对方案 |
|------|----------|
| PDF 解析格式多样 | 优先支持标准 PDF，逐步覆盖特殊格式 |
| 章节标题识别不准 | 结合字体/字号 + 目录结构双重判断 |
| LLM 调用成本高 | 优先用 extractive 摘要，需要时再调用 LLM |
| Qdrant 连接问题 | 准备本地文件 fallback 方案 |