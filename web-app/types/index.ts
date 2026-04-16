import type { RagCitation, RetrievalPathStep } from "@/types/rag";

export type DocumentStatus = "UPLOADING" | "PARSING" | "INDEXED" | "FAILED";

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: DocumentStatus;
  structureTree?: unknown;
  pageCount?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatSession {
  id: string;
  documentId: string;
  documentIds?: string[];
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatRole = "USER" | "ASSISTANT" | "SYSTEM";

export type Citation = RagCitation & {
  documentId?: string;
  documentName?: string;
};

export type RetrievalPath = RetrievalPathStep;

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  retrievalPath?: RetrievalPath[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}
