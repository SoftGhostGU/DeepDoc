import type {
  DocumentTreeNode,
  ParagraphItem,
  ParseResponse,
  RagCitation,
  RetrieveResponse,
} from "@/types/rag";

export const mockDocumentTree: DocumentTreeNode = {
  id: "root",
  title: "DeepDoc 产品方案",
  level: 0,
  summary: "项目愿景、架构设计与实施阶段。",
  children: [
    {
      id: "sec-1",
      title: "第一章 问题定义",
      level: 1,
      summary: "为什么层级检索能改善长文档问答质量。",
      children: [
        {
          id: "sec-1-1",
          title: "1.1 现有痛点",
          level: 2,
          summary: "扁平分块检索忽略了章节意图与层级结构。",
        },
        {
          id: "sec-1-2",
          title: "1.2 目标用户",
          level: 2,
          summary: "面向研究人员和分析师，需要快速定位百页级文档中的关键信息。",
        },
      ],
    },
    {
      id: "sec-2",
      title: "第二章 系统设计",
      level: 1,
      summary: "两阶段检索管线与 SSE 流式回答生成。",
      children: [
        {
          id: "sec-2-1",
          title: "2.1 检索策略",
          level: 2,
          summary: "摘要级召回后接段落级精排。",
        },
        {
          id: "sec-2-2",
          title: "2.2 索引构建",
          level: 2,
          summary: "多粒度 chunking：章节摘要 + 段落 + 句子三级索引。",
        },
        {
          id: "sec-2-3",
          title: "2.3 混合检索",
          level: 2,
          summary: "Dense + Sparse + RRF 融合排序。",
        },
      ],
    },
    {
      id: "sec-3",
      title: "第三章 技术架构",
      level: 1,
      summary: "微服务架构设计，Python RAG + Next.js 全栈。",
      children: [
        {
          id: "sec-3-1",
          title: "3.1 服务拆分",
          level: 2,
          summary: "Python 专注算法，Next.js 专注产品，通过 HTTP/SSE 通信。",
        },
        {
          id: "sec-3-2",
          title: "3.2 数据流",
          level: 2,
          summary: "文档上传 → 解析 → 索引 → 检索 → 生成，全链路可观测。",
        },
        {
          id: "sec-3-3",
          title: "3.3 部署方案",
          level: 2,
          summary: "Docker Compose 一键部署，含 Qdrant 向量库。",
        },
      ],
    },
    {
      id: "sec-4",
      title: "第四章 前端设计",
      level: 1,
      summary: "可视化交互界面，包含思维导图、热力图、检索路径等组件。",
      children: [
        {
          id: "sec-4-1",
          title: "4.1 页面结构",
          level: 2,
          summary: "文档管理页、问答页、对比页三大核心页面。",
        },
        {
          id: "sec-4-2",
          title: "4.2 可视化组件",
          level: 2,
          summary: "React Flow 思维导图、ECharts 热力图、检索路径流程图。",
        },
      ],
    },
    {
      id: "sec-5",
      title: "第五章 实验评估",
      level: 1,
      summary: "对比实验设计与效果分析。",
      children: [
        {
          id: "sec-5-1",
          title: "5.1 评估指标",
          level: 2,
          summary: "使用 Recall@K、MRR、答案准确率等指标衡量检索质量。",
        },
        {
          id: "sec-5-2",
          title: "5.2 Baseline 对比",
          level: 2,
          summary: "朴素 RAG 与层级 RAG 在相同数据集上的效果差异。",
        },
      ],
    },
  ],
};

export const mockSuggestedQuestions = [
  "这份方案里的层级检索核心流程是什么？",
  "相比朴素 RAG，层级 RAG 的关键优势有哪些？",
  "系统是如何通过 SSE 向前端展示阶段进度的？",
  "文档里提到的评估指标和实验结果分别是什么？",
];

export const mockDocumentOverview = {
  documentName: "DeepDoc 产品方案",
  pageCount: 12,
  sectionCount: 15,
  summary:
    "该文档围绕 DeepDoc 的层级检索问答系统展开，覆盖问题定义、检索架构、前端交互设计与实验评估，重点强调可追溯引用与多阶段检索流程。",
};

export const mockParagraphs: ParagraphItem[] = [
  { id: "p-1", node_id: "sec-1-1", page: 1, index: 1, text: "传统 RAG 系统将文档视为扁平分块，常常忽略章节层级和段落意图。" },
  { id: "p-2", node_id: "sec-1-1", page: 1, index: 2, text: "用户在长文档场景下，需要反复浏览才能验证答案的出处和可靠性。" },
  { id: "p-3", node_id: "sec-1-2", page: 2, index: 3, text: "目标用户包括法律分析师、技术文档审查员和学术研究人员。" },
  { id: "p-4", node_id: "sec-1-2", page: 2, index: 4, text: "这些用户通常需要处理 100 页以上的复杂文档。" },
  { id: "p-5", node_id: "sec-2-1", page: 3, index: 5, text: "层级检索策略先选取候选摘要，再深入到相关段落进行精确溯源。" },
  { id: "p-6", node_id: "sec-2-1", page: 3, index: 6, text: "两阶段检索显著降低了传入 LLM 的噪声上下文量。" },
  { id: "p-7", node_id: "sec-2-2", page: 4, index: 7, text: "索引构建采用章节摘要、段落和句子三级粒度。" },
  { id: "p-8", node_id: "sec-2-2", page: 4, index: 8, text: "摘要由 LLM 自动生成，保留章节的核心语义。" },
  { id: "p-9", node_id: "sec-2-3", page: 5, index: 9, text: "混合检索结合 Dense 向量检索与 Sparse BM25 关键词匹配。" },
  { id: "p-10", node_id: "sec-2-3", page: 5, index: 10, text: "RRF 融合排序确保两种检索信号互补。" },
  { id: "p-11", node_id: "sec-3-1", page: 6, index: 11, text: "Python RAG 服务负责文档解析、索引构建、检索和生成。" },
  { id: "p-12", node_id: "sec-3-1", page: 6, index: 12, text: "Next.js 应用负责用户交互、会话管理和 SSE 流式转发。" },
  { id: "p-13", node_id: "sec-3-2", page: 7, index: 13, text: "文档上传后自动触发解析和索引构建流水线。" },
  { id: "p-14", node_id: "sec-3-2", page: 7, index: 14, text: "每个检索阶段通过 SSE 事件实时推送到前端展示。" },
  { id: "p-15", node_id: "sec-3-3", page: 8, index: 15, text: "Docker Compose 编排三个服务：Web、RAG 和 Qdrant。" },
  { id: "p-16", node_id: "sec-3-3", page: 8, index: 16, text: "向量库 Qdrant 支持高效的 ANN 近似最近邻检索。" },
  { id: "p-17", node_id: "sec-4-1", page: 9, index: 17, text: "文档管理页提供拖拽上传、状态追踪和批量操作。" },
  { id: "p-18", node_id: "sec-4-1", page: 9, index: 18, text: "问答页采用三栏布局：会话列表、对话区和可视化面板。" },
  { id: "p-19", node_id: "sec-4-2", page: 10, index: 19, text: "React Flow 渲染的思维导图支持展开、折叠和高亮。" },
  { id: "p-20", node_id: "sec-4-2", page: 10, index: 20, text: "ECharts 热力图按检索相关度对文档段落染色。" },
  { id: "p-21", node_id: "sec-4-2", page: 10, index: 21, text: "检索路径流程图用动画展示 Query 到 Answer 的完整链路。" },
  { id: "p-22", node_id: "sec-5-1", page: 11, index: 22, text: "Recall@K 衡量前 K 个检索结果中包含正确答案的比例。" },
  { id: "p-23", node_id: "sec-5-1", page: 11, index: 23, text: "MRR 指标评估第一个正确结果在排序列表中的位置。" },
  { id: "p-24", node_id: "sec-5-2", page: 12, index: 24, text: "在 50 页技术文档测试集上，层级 RAG 的 Recall@10 达到 92%。" },
  { id: "p-25", node_id: "sec-5-2", page: 12, index: 25, text: "朴素 RAG 在相同测试集上的 Recall@10 仅为 67%。" },
  { id: "p-26", node_id: "sec-5-2", page: 12, index: 26, text: "层级检索的答案准确率相比朴素方法提升了 23 个百分点。" },
  { id: "p-27", node_id: "sec-2-1", page: 3, index: 27, text: "摘要级检索使用章节级 embedding 进行粗筛。" },
  { id: "p-28", node_id: "sec-3-2", page: 7, index: 28, text: "SSE 事件包含 stage、token、retrieval_summary、retrieval_paragraphs 和 final 五种类型。" },
  { id: "p-29", node_id: "sec-4-2", page: 10, index: 29, text: "性能监控面板展示各阶段耗时和 token 生成速度。" },
  { id: "p-30", node_id: "sec-5-1", page: 11, index: 30, text: "端到端延迟从朴素方法的 4.2 秒降低到层级方法的 3.1 秒。" },
];

export const mockCitations: RagCitation[] = [
  {
    id: 1,
    paragraph_id: "p-5",
    text: mockParagraphs[4]?.text ?? "",
    path: ["第二章", "第 2.1 节", "段落 5"],
    score: 0.95,
    page: mockParagraphs[4]?.page,
  },
  {
    id: 2,
    paragraph_id: "p-6",
    text: mockParagraphs[5]?.text ?? "",
    path: ["第二章", "第 2.1 节", "段落 6"],
    score: 0.93,
    page: mockParagraphs[5]?.page,
  },
  {
    id: 3,
    paragraph_id: "p-24",
    text: mockParagraphs[23]?.text ?? "",
    path: ["第五章", "第 5.2 节", "段落 24"],
    score: 0.91,
    page: mockParagraphs[23]?.page,
  },
  {
    id: 4,
    paragraph_id: "p-25",
    text: mockParagraphs[24]?.text ?? "",
    path: ["第五章", "第 5.2 节", "段落 25"],
    score: 0.88,
    page: mockParagraphs[24]?.page,
  },
  {
    id: 5,
    paragraph_id: "p-26",
    text: mockParagraphs[25]?.text ?? "",
    path: ["第五章", "第 5.2 节", "段落 26"],
    score: 0.85,
    page: mockParagraphs[25]?.page,
  },
];

export const mockMultiDocCitations: RagCitation[] = [
  {
    id: 1,
    paragraph_id: "p-7",
    text: mockParagraphs[6]?.text ?? "",
    path: ["架构白皮书", "第二章", "段落 7"],
    score: 0.96,
    page: mockParagraphs[6]?.page,
    documentId: "doc-architecture",
    documentName: "架构白皮书",
  },
  {
    id: 2,
    paragraph_id: "p-18",
    text: mockParagraphs[17]?.text ?? "",
    path: ["产品方案", "第四章", "段落 18"],
    score: 0.93,
    page: mockParagraphs[17]?.page,
    documentId: "doc-product-plan",
    documentName: "产品方案",
  },
  {
    id: 3,
    paragraph_id: "p-26",
    text: mockParagraphs[25]?.text ?? "",
    path: ["实验评估报告", "第五章", "段落 26"],
    score: 0.91,
    page: mockParagraphs[25]?.page,
    documentId: "doc-evaluation",
    documentName: "实验评估报告",
  },
];

export const mockRetrieveResponse: RetrieveResponse = {
  results: [
    {
      id: "chunk-1",
      text: mockParagraphs[4]?.text ?? "",
      score: 0.95,
      path: ["第二章", "第 2.1 节"],
    },
    {
      id: "chunk-2",
      text: mockParagraphs[5]?.text ?? "",
      score: 0.93,
      path: ["第二章", "第 2.1 节"],
    },
    {
      id: "chunk-3",
      text: mockParagraphs[23]?.text ?? "",
      score: 0.91,
      path: ["第五章", "第 5.2 节"],
    },
    {
      id: "chunk-4",
      text: mockParagraphs[24]?.text ?? "",
      score: 0.88,
      path: ["第五章", "第 5.2 节"],
    },
    {
      id: "chunk-5",
      text: mockParagraphs[25]?.text ?? "",
      score: 0.85,
      path: ["第五章", "第 5.2 节"],
    },
  ],
  retrieval_path: [
    {
      stage: "analyzing",
      message: "正在分析查询意图",
    },
    {
      stage: "retrieving_summary",
      message: "正在选择高层级章节",
    },
    {
      stage: "retrieving_paragraphs",
      message: "正在精排到段落级证据",
    },
  ],
  scores: [0.95, 0.93, 0.91, 0.88, 0.85],
};

export const mockAnswerText =
  "层级检索通过两步缩窄上下文来提升回答质量：摘要级路由和段落级溯源，减少噪声分块并使引用对齐到最相关证据[1][2]。实验表明，在 50 页技术文档测试集上，层级 RAG 的 Recall@10 达到 92%，相比朴素方法的 67% 有显著提升[3][4][5]。";

export const mockMultiDocAnswerText =
  "从《架构白皮书》来看，索引构建采用三级粒度（章节摘要、段落、句子）以提升召回精度[1]；《产品方案》强调问答页应采用三栏结构以支持会话与可视化并行[2]；《实验评估报告》给出层级检索相对朴素方法准确率提升 23 个百分点的结果[3]。";

export const mockCompareAnswerNaive =
  "朴素检索可以快速回答，但往往包含松散相关信息，溯源能力较弱。Recall@10 仅为 67%。";

export const mockCompareAnswerHierarchical =
  "层级检索花费更多时间选择结构感知的上下文，然后返回更紧凑、可追溯的引用。Recall@10 达到 92%。";

export function buildMockParseResponse(docId: string): ParseResponse {
  return {
    doc_id: docId,
    structure_tree: mockDocumentTree,
    stats: {
      page_count: 12,
      paragraph_count: mockParagraphs.length,
      section_count: 15,
    },
  };
}
