import assert from "node:assert/strict";
import test from "node:test";

import { parseUploadErrorResponse } from "./upload-error.ts";

test("parseUploadErrorResponse extracts structured upstream errors", () => {
  const parsed = parseUploadErrorResponse(
    502,
    JSON.stringify({
      error: "Embedding upstream request failed",
      code: "EMBEDDING_UPSTREAM_ERROR",
      detail: "model=ecnu-embedding-small url=https://embed.example.com/v1/embeddings status=500",
    }),
  );

  assert.deepEqual(parsed, {
    status: 502,
    error: "Embedding upstream request failed",
    code: "EMBEDDING_UPSTREAM_ERROR",
    detail: "model=ecnu-embedding-small url=https://embed.example.com/v1/embeddings status=500",
  });
});

test("parseUploadErrorResponse falls back to plain text when payload is not json", () => {
  const parsed = parseUploadErrorResponse(500, "index failed");

  assert.deepEqual(parsed, {
    status: 500,
    error: "Upload failed with status 500",
    code: undefined,
    detail: "index failed",
  });
});
