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
      ],
    },
  ],
};

export const mockParagraphs: ParagraphItem[] = [
  {
    id: "p-1",
    node_id: "sec-1-1",
    page: 1,
    index: 1,
    text: "传统 RAG 系统将文档视为扁平分块，常常忽略章节层级和段落意图。",
  },
  {
    id: "p-2",
    node_id: "sec-2-1",
    page: 2,
    index: 2,
    text: "层级检索策略先选取候选摘要，再深入到相关段落进行精确溯源。",
  },
  {
    id: "p-3",
    node_id: "sec-2-1",
    page: 2,
    index: 3,
    text: "流式阶段展示了分析、改写、检索、生成等步骤，便于调试和可观测性。",
  },
];

export const mockCitations: RagCitation[] = [
  {
    id: 1,
    paragraph_id: "p-2",
    text: mockParagraphs[1]?.text ?? "",
    path: ["第二章", "第 2.1 节", "段落 2"],
    score: 0.93,
  },
  {
    id: 2,
    paragraph_id: "p-3",
    text: mockParagraphs[2]?.text ?? "",
    path: ["第二章", "第 2.1 节", "段落 3"],
    score: 0.89,
  },
];

export const mockRetrieveResponse: RetrieveResponse = {
  results: [
    {
      id: "chunk-1",
      text: mockParagraphs[1]?.text ?? "",
      score: 0.93,
      path: ["第二章", "第 2.1 节"],
    },
    {
      id: "chunk-2",
      text: mockParagraphs[2]?.text ?? "",
      score: 0.89,
      path: ["第二章", "第 2.1 节"],
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
  scores: [0.93, 0.89],
};

export const mockAnswerText =
  "层级检索通过两步缩窄上下文来提升回答质量：摘要级路由和段落级溯源，减少噪声分块并使引用对齐到最相关证据[1][2]。";

export const mockCompareAnswerNaive =
  "朴素检索可以快速回答，但往往包含松散相关信息，溯源能力较弱。";

export const mockCompareAnswerHierarchical =
  "层级检索花费更多时间选择结构感知的上下文，然后返回更紧凑、可追溯的引用。";

export function buildMockParseResponse(docId: string): ParseResponse {
  return {
    doc_id: docId,
    structure_tree: mockDocumentTree,
    stats: {
      page_count: 2,
      paragraph_count: mockParagraphs.length,
      section_count: 4,
    },
  };
}
