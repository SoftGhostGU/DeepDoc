import type {
  DocumentTreeNode,
  ParagraphItem,
  ParseResponse,
  RagCitation,
  RetrieveResponse,
} from "@/types/rag";

export const mockDocumentTree: DocumentTreeNode = {
  id: "root",
  title: "DeepDoc Product Plan",
  level: 0,
  summary: "Project vision, architecture, and implementation phases.",
  children: [
    {
      id: "sec-1",
      title: "1. Problem Statement",
      level: 1,
      summary: "Why hierarchical retrieval improves long-document QA.",
      children: [
        {
          id: "sec-1-1",
          title: "1.1 Pain Points",
          level: 2,
          summary: "Flat chunk retrieval misses chapter-level intent.",
        },
      ],
    },
    {
      id: "sec-2",
      title: "2. System Design",
      level: 1,
      summary: "Two-stage retrieval pipeline and SSE answer generation.",
      children: [
        {
          id: "sec-2-1",
          title: "2.1 Retrieval Strategy",
          level: 2,
          summary: "Summary-level recall followed by paragraph refinement.",
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
    text: "Traditional RAG systems treat documents as flat chunks, which often ignores chapter hierarchy and section intent.",
  },
  {
    id: "p-2",
    node_id: "sec-2-1",
    page: 2,
    index: 2,
    text: "The hierarchical strategy first selects candidate summaries, then drills down into relevant paragraphs for precise grounding.",
  },
  {
    id: "p-3",
    node_id: "sec-2-1",
    page: 2,
    index: 3,
    text: "Streaming stages expose analyzing, rewriting, retrieving, and generating steps for transparency and debugging.",
  },
];

export const mockCitations: RagCitation[] = [
  {
    id: 1,
    paragraph_id: "p-2",
    text: mockParagraphs[1]?.text ?? "",
    path: ["Chapter 2", "Section 2.1", "Paragraph 2"],
    score: 0.93,
  },
  {
    id: 2,
    paragraph_id: "p-3",
    text: mockParagraphs[2]?.text ?? "",
    path: ["Chapter 2", "Section 2.1", "Paragraph 3"],
    score: 0.89,
  },
];

export const mockRetrieveResponse: RetrieveResponse = {
  results: [
    {
      id: "chunk-1",
      text: mockParagraphs[1]?.text ?? "",
      score: 0.93,
      path: ["Chapter 2", "Section 2.1"],
    },
    {
      id: "chunk-2",
      text: mockParagraphs[2]?.text ?? "",
      score: 0.89,
      path: ["Chapter 2", "Section 2.1"],
    },
  ],
  retrieval_path: [
    {
      stage: "analyzing",
      message: "Interpreting user intent",
    },
    {
      stage: "retrieving_summary",
      message: "Selecting high-level sections",
    },
    {
      stage: "retrieving_paragraphs",
      message: "Refining to paragraph-level evidence",
    },
  ],
  scores: [0.93, 0.89],
};

export const mockAnswerText =
  "Hierarchical retrieval improves answer quality by narrowing context in two steps: summary-level routing and paragraph-level grounding. It reduces noisy chunks and keeps citations aligned to the most relevant evidence [1][2].";

export const mockCompareAnswerNaive =
  "Naive retrieval can answer quickly, but often includes loosely related context and weaker grounding.";

export const mockCompareAnswerHierarchical =
  "Hierarchical retrieval spends more time selecting structure-aware context, then returns tighter and more traceable citations.";

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
