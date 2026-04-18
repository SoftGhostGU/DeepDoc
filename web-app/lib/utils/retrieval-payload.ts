import type { ParagraphItem, RetrievedChunk } from "../../types/rag.ts";

export function buildSectionKey(documentId?: string, sectionId?: string) {
  if (documentId && sectionId) {
    return `${documentId}:${sectionId}`;
  }

  return documentId || sectionId || "unknown";
}

export function getParagraphGroupKey(paragraph: ParagraphItem) {
  return paragraph.sectionKey || buildSectionKey(paragraph.documentId, paragraph.node_id);
}

export function formatParagraphGroupLabel(
  paragraph: ParagraphItem,
  sectionTitleMap: Map<string, string>,
) {
  const sectionTitle =
    paragraph.sectionTitle ||
    (paragraph.node_id ? sectionTitleMap.get(paragraph.node_id) : undefined) ||
    paragraph.node_id ||
    "未分类";

  if (paragraph.documentName) {
    return `${paragraph.documentName} · ${sectionTitle}`;
  }

  return sectionTitle;
}

export function getMindmapHighlightIds(
  chunks: RetrievedChunk[],
  activeDocumentId?: string | null,
) {
  const ids = new Set<string>();
  if (chunks.length === 0) {
    return ids;
  }

  if (activeDocumentId) {
    const hasForeignDocumentChunk = chunks.some(
      (chunk) => chunk.documentId && chunk.documentId !== activeDocumentId,
    );
    if (hasForeignDocumentChunk) {
      return ids;
    }
  }

  for (const chunk of chunks) {
    if (chunk.sectionId) {
      ids.add(chunk.sectionId);
    }
  }

  return ids;
}
