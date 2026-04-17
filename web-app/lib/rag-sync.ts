export type SyncableDocument = {
  id: string;
  status: string;
  ragDocumentId: string | null;
};

export class RagDocumentSyncError extends Error {
  code: "DOCUMENT_NOT_FOUND" | "DOCUMENT_NOT_INDEXED" | "DOCUMENT_NOT_SYNCED";
  status: number;

  constructor(
    code: "DOCUMENT_NOT_FOUND" | "DOCUMENT_NOT_INDEXED" | "DOCUMENT_NOT_SYNCED",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "RagDocumentSyncError";
    this.code = code;
    this.status = status;
  }
}

export function resolveSingleRagDocumentId(document: SyncableDocument | null | undefined): string {
  if (!document) {
    throw new RagDocumentSyncError("DOCUMENT_NOT_FOUND", "Document not found", 404);
  }

  if (document.status !== "INDEXED") {
    throw new RagDocumentSyncError(
      "DOCUMENT_NOT_INDEXED",
      "Document is not indexed yet. Please wait for indexing to finish.",
      409,
    );
  }

  const ragDocumentId = document.ragDocumentId?.trim();
  if (!ragDocumentId) {
    throw new RagDocumentSyncError(
      "DOCUMENT_NOT_SYNCED",
      "Document is not synchronized with the RAG service yet.",
      409,
    );
  }

  return ragDocumentId;
}

export function resolveRagDocumentIds(requestedDocumentIds: string[], documents: SyncableDocument[]) {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const ragDocumentIds = requestedDocumentIds.map((documentId) =>
    resolveSingleRagDocumentId(documentsById.get(documentId)),
  );

  return {
    primaryDocumentId: ragDocumentIds[0] ?? "",
    ragDocumentIds,
  };
}
