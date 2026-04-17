import assert from "node:assert/strict";
import test from "node:test";

import { parseAndIndexDocument } from "./rag-upload.ts";

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
