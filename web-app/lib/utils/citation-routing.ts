import { buildPdfPageHref } from "./citation-preview.ts";

import type { Citation, Document } from "../../types/index.ts";

type CitationRoutingArgs = {
  citation: Citation | null;
  documents: Document[];
  primaryDocument: Document | null;
  isMultiDocumentSession: boolean;
};

export function resolveCitationDocument({
  citation,
  documents,
  primaryDocument,
  isMultiDocumentSession,
}: CitationRoutingArgs): Document | null {
  if (!citation) {
    return null;
  }

  if (citation.documentId) {
    const byId = documents.find(
      (candidate) =>
        candidate.id === citation.documentId || candidate.ragDocumentId === citation.documentId,
    );
    if (byId) {
      return byId;
    }
  }

  if (citation.documentName) {
    const byName = documents.find(
      (candidate) =>
        candidate.originalName === citation.documentName ||
        candidate.filename === citation.documentName,
    );
    if (byName) {
      return byName;
    }
  }

  if (!isMultiDocumentSession && !citation.documentId && !citation.documentName) {
    return primaryDocument;
  }

  return null;
}

export function getCitationPdfHref(args: CitationRoutingArgs) {
  const citationDocument = resolveCitationDocument(args);
  if (citationDocument?.mimeType !== "application/pdf") {
    return null;
  }

  return buildPdfPageHref(citationDocument.filename, args.citation?.page);
}
