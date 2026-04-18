import assert from "node:assert/strict";
import test from "node:test";

import { getCitationPdfHref } from "./citation-routing.ts";
import type { Citation, Document } from "@/types";

const pdfDocument: Document = {
  id: "web-a",
  filename: "alpha.pdf",
  originalName: "Alpha",
  size: 1,
  mimeType: "application/pdf",
  status: "INDEXED",
  ragDocumentId: "rag-a",
  createdAt: new Date().toISOString(),
};

test("getCitationPdfHref resolves exact rag document matches", () => {
  const citation: Citation = {
    id: 1,
    paragraph_id: "p-1",
    text: "alpha",
    path: ["Section A"],
    score: 0.9,
    page: 5,
    documentId: "rag-a",
  };

  const href = getCitationPdfHref({
    citation,
    documents: [pdfDocument],
    primaryDocument: pdfDocument,
    isMultiDocumentSession: false,
  });

  assert.equal(href, "/uploads/alpha.pdf#page=5");
});

test("getCitationPdfHref does not fall back to the primary document in multi-doc sessions", () => {
  const citation: Citation = {
    id: 2,
    paragraph_id: "p-2",
    text: "beta",
    path: ["Section B"],
    score: 0.8,
    page: 2,
  };

  const href = getCitationPdfHref({
    citation,
    documents: [pdfDocument],
    primaryDocument: pdfDocument,
    isMultiDocumentSession: true,
  });

  assert.equal(href, null);
});

test("getCitationPdfHref allows single-doc fallback for legacy citations without document identity", () => {
  const citation: Citation = {
    id: 3,
    paragraph_id: "p-3",
    text: "gamma",
    path: ["Section C"],
    score: 0.7,
    page: 9,
  };

  const href = getCitationPdfHref({
    citation,
    documents: [pdfDocument],
    primaryDocument: pdfDocument,
    isMultiDocumentSession: false,
  });

  assert.equal(href, "/uploads/alpha.pdf#page=9");
});
