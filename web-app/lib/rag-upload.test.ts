import assert from "node:assert/strict";
import test from "node:test";

import { parseAndIndexDocument, RagUploadError } from "./rag-upload.ts";

test("parseAndIndexDocument indexes the rag document returned by parse", async () => {
  const calls: Array<{ endpoint: string; body?: unknown; fileName?: string }> = [];
  const file = new File(["hello"], "sample.pdf", { type: "application/pdf" });

  const result = await parseAndIndexDocument({
    file,
    forwardMultipartToRag: async (endpoint, formData) => {
      calls.push({
        endpoint,
        fileName: (formData.get("file") as File | null)?.name,
      });

      return new Response(
        JSON.stringify({
          doc_id: "rag-doc-123",
          structure_tree: { id: "root", title: "Sample" },
          stats: { page_count: 3 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    },
    forwardJsonToRag: async (endpoint, body) => {
      calls.push({ endpoint, body });

      return new Response(
        JSON.stringify({
          doc_id: "rag-doc-123",
          indices: [],
          build_time: 0.4,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(result.ragDocumentId, "rag-doc-123");
  assert.deepEqual(calls, [
    { endpoint: "/api/documents/parse", fileName: "sample.pdf" },
    {
      endpoint: "/api/documents/rag-doc-123/index",
      body: {
        doc_id: "rag-doc-123",
        strategies: ["hierarchical"],
      },
    },
  ]);
});

test("parseAndIndexDocument keeps parse payload when index fails", async () => {
  const file = new File(["hello"], "sample.pdf", { type: "application/pdf" });

  const error = await parseAndIndexDocument({
    file,
    forwardMultipartToRag: async () =>
      new Response(
        JSON.stringify({
          doc_id: "rag-doc-456",
          structure_tree: { id: "root", title: "Sample" },
          stats: { page_count: 8 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    forwardJsonToRag: async () =>
      new Response("index failed", { status: 500, headers: { "Content-Type": "text/plain" } }),
  }).catch((reason) => reason);

  assert.ok(error instanceof RagUploadError);
  assert.equal(error.stage, "index");
  assert.equal(error.ragDocumentId, "rag-doc-456");
  assert.deepEqual(error.parsePayload, {
    doc_id: "rag-doc-456",
    structure_tree: { id: "root", title: "Sample" },
    stats: { page_count: 8 },
  });
});

test("parseAndIndexDocument parses structured index errors", async () => {
  const file = new File(["hello"], "sample.pdf", { type: "application/pdf" });

  const error = await parseAndIndexDocument({
    file,
    forwardMultipartToRag: async () =>
      new Response(
        JSON.stringify({
          doc_id: "rag-doc-789",
          structure_tree: { id: "root", title: "Sample" },
          stats: { page_count: 5 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    forwardJsonToRag: async () =>
      new Response(
        JSON.stringify({
          error: "Embedding upstream request failed",
          code: "EMBEDDING_UPSTREAM_ERROR",
          detail: "model=ecnu-embedding-small url=https://embed.example.com/v1/embeddings status=500",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
  }).catch((reason) => reason);

  assert.ok(error instanceof RagUploadError);
  assert.equal(error.stage, "index");
  assert.equal(error.status, 502);
  assert.equal(error.message, "Embedding upstream request failed");
  assert.equal(error.code, "EMBEDDING_UPSTREAM_ERROR");
  assert.equal(
    error.detail,
    "model=ecnu-embedding-small url=https://embed.example.com/v1/embeddings status=500",
  );
});
