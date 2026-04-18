import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSectionKey,
  formatParagraphGroupLabel,
  getMindmapHighlightIds,
  getParagraphGroupKey,
} from "./retrieval-payload.ts";
import type { ParagraphItem, RetrievedChunk } from "@/types/rag";

test("buildSectionKey combines document and section identifiers", () => {
  assert.equal(buildSectionKey("rag-doc-1", "sec-1"), "rag-doc-1:sec-1");
  assert.equal(buildSectionKey(undefined, "sec-1"), "sec-1");
  assert.equal(buildSectionKey("rag-doc-1", undefined), "rag-doc-1");
});

test("getMindmapHighlightIds disables highlighting when retrieval spans other documents", () => {
  const chunks: RetrievedChunk[] = [
    {
      id: "c-1",
      text: "A",
      score: 0.9,
      path: ["Doc A", "Intro"],
      sectionId: "sec-1",
      documentId: "rag-a",
      sectionKey: "rag-a:sec-1",
    },
    {
      id: "c-2",
      text: "B",
      score: 0.8,
      path: ["Doc B", "Intro"],
      sectionId: "sec-1",
      documentId: "rag-b",
      sectionKey: "rag-b:sec-1",
    },
  ];

  assert.deepEqual(Array.from(getMindmapHighlightIds(chunks, "rag-a")), []);
});

test("paragraph grouping uses section keys instead of bare section ids", () => {
  const left: ParagraphItem = {
    id: "p-1",
    node_id: "sec-1",
    page: 1,
    index: 1,
    text: "left",
    documentId: "rag-a",
    sectionKey: "rag-a:sec-1",
  };
  const right: ParagraphItem = {
    id: "p-2",
    node_id: "sec-1",
    page: 2,
    index: 2,
    text: "right",
    documentId: "rag-b",
    sectionKey: "rag-b:sec-1",
  };

  assert.notEqual(getParagraphGroupKey(left), getParagraphGroupKey(right));
});

test("formatParagraphGroupLabel prefers document and section titles for multi-doc payloads", () => {
  const paragraph: ParagraphItem = {
    id: "p-3",
    node_id: "sec-2",
    page: 3,
    index: 4,
    text: "payload",
    documentName: "Doc A",
    sectionTitle: "Results",
    sectionKey: "rag-a:sec-2",
  };

  assert.equal(formatParagraphGroupLabel(paragraph, new Map()), "Doc A · Results");
});
