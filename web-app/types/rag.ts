export type RagMode = "hierarchical" | "naive";

export type RagStage =
  | "analyzing"
  | "rewriting"
  | "retrieving_summary"
  | "retrieving_paragraphs"
  | "generating";

export interface DocumentTreeNode {
  id: string;
  title: string;
  level: number;
  summary?: string;
  children?: DocumentTreeNode[];
}

export interface DocumentTree {
  doc_id: string;
  root: DocumentTreeNode;
}

export interface ParagraphItem {
  id: string;
  node_id?: string;
  page?: number;
  index: number;
  text: string;
}

export interface ParagraphList {
  doc_id: string;
  paragraphs: ParagraphItem[];
}

export interface ParseStats {
  page_count: number;
  paragraph_count: number;
  section_count?: number;
}

export interface ParseResponse {
  doc_id: string;
  structure_tree: DocumentTreeNode;
  stats: ParseStats;
}

export interface IndexResponse {
  doc_id: string;
  indices: string[];
  build_time: number;
}

export interface RetrieveRequest {
  doc_id: string;
  query: string;
  mode: RagMode;
  options?: {
    top_k?: number;
    include_summary?: boolean;
  };
}

export interface RetrievalPathStep {
  stage: RagStage | "done";
  message: string;
  started_at?: string;
  finished_at?: string;
}

export interface RetrievedChunk {
  id: string;
  text: string;
  score: number;
  path: string[];
}

export interface RetrieveResponse {
  results: RetrievedChunk[];
  retrieval_path: RetrievalPathStep[];
  scores: number[];
}

export interface AskRequest {
  doc_id: string;
  session_id?: string;
  query: string;
  mode?: RagMode;
  rewrite_options?: Record<string, unknown>;
}

export interface CompareRequest {
  doc_id: string;
  query: string;
}

export interface RagCitation {
  id: number;
  paragraph_id: string;
  text: string;
  path: string[];
  score: number;
}

export interface SseStageEvent {
  event: "stage";
  data: {
    stage: RagStage;
    message: string;
  };
}

export interface SseTokenEvent {
  event: "token";
  data: {
    stage: "generating";
    token: string;
  };
}

export interface SseRetrievalSummaryEvent {
  event: "retrieval_summary";
  data: {
    chunks: RetrievedChunk[];
  };
}

export interface SseRetrievalParagraphsEvent {
  event: "retrieval_paragraphs";
  data: {
    paragraphs: ParagraphItem[];
  };
}

export interface SseFinalEvent {
  event: "final";
  data: {
    answer: string;
    citations: RagCitation[];
    retrieval_path?: RetrievalPathStep[];
  };
}

export interface SseCompareTrackEvent {
  event: "compare_track";
  data: {
    track: "naive" | "hierarchical";
    token?: string;
    answer?: string;
    citations?: RagCitation[];
    done?: boolean;
  };
}

export interface SseErrorEvent {
  event: "error";
  data: {
    message: string;
  };
}

export type AskSseEvent =
  | SseStageEvent
  | SseTokenEvent
  | SseRetrievalSummaryEvent
  | SseRetrievalParagraphsEvent
  | SseFinalEvent
  | SseErrorEvent;

export type CompareSseEvent =
  | SseStageEvent
  | SseCompareTrackEvent
  | SseErrorEvent
  | SseFinalEvent;
