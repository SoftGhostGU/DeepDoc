import assert from "node:assert/strict";
import test from "node:test";

import {
  RagDocumentSyncError,
  resolveRagDocumentIds,
  resolveSingleRagDocumentId,
} from "./rag-sync.ts";

test("resolveRagDocumentIds preserves request order and returns rag ids", () => {
  const result = resolveRagDocumentIds(
    ["web-b", "web-a"],
    [
      { id: "web-a", status: "INDEXED", ragDocumentId: "rag-a" },
      { id: "web-b", status: "INDEXED", ragDocumentId: "rag-b" },
    ],
  );

  assert.deepEqual(result, {
    primaryDocumentId: "rag-b",
    ragDocumentIds: ["rag-b", "rag-a"],
  });
});

test("resolveSingleRagDocumentId rejects unsynchronized documents", () => {
  assert.throws(
    () =>
      resolveSingleRagDocumentId({
        id: "web-a",
        status: "INDEXED",
        ragDocumentId: null,
      }),
    (error: unknown) =>
      error instanceof RagDocumentSyncError &&
      error.code === "DOCUMENT_NOT_SYNCED" &&
      error.status === 409,
  );
});
