## Context

DeepDoc now reaches the real rag service in full-stack Docker mode, but the end-to-end document lifecycle is split across two storage systems that are not synchronized. The web app stores document state in Prisma, while the rag service creates its own document identifiers and retrieval data in SQLite. The current upload route stops after `/api/documents/parse`, discards the rag document ID, and marks the Prisma record as indexed even though the backend has not built retrieval chunks with embeddings. At query time, the web app sends its Prisma document ID to rag routes that expect the rag-side document ID.

The current full-stack Docker flow also assumes outbound access to Hugging Face for `SentenceTransformer` downloads. In restricted-network environments this causes the first real retrieval request to fail during embedding model loading, which then surfaces as an SSE stream error instead of an actionable setup issue.

## Goals / Non-Goals

**Goals:**
- Make the real upload flow produce a chat-ready rag document before the web record is marked `INDEXED`.
- Persist enough backend identity in Prisma to route suggest/chat/compare requests to the correct rag document.
- Fail fast with actionable errors when a document is not synchronized or the full-stack embedding setup is incomplete.
- Make Docker full-stack mode configurable for restricted-network embedding downloads without changing mock-only mode.

**Non-Goals:**
- Re-architect the rag service storage model or replace its SQLite-backed indexing implementation.
- Introduce a new cross-service document deletion protocol in this change.
- Redesign the retrieval or generation algorithms beyond what is required to make the existing pipeline usable.

## Decisions

### Persist rag document identity in Prisma
The web `Document` record will gain an optional `ragDocumentId` field that stores the backend document identifier returned by `/api/documents/parse`.

Rationale:
- The web app is the system of record for UI navigation and chat session ownership.
- The rag service is the system of record for retrieval data.
- Persisting the mapping in Prisma is the smallest change that lets all web routes translate from UI document IDs to rag document IDs.

Alternatives considered:
- Reuse the Prisma ID as the rag document ID. Rejected because the current rag parse API generates its own identifier and changing that contract would touch more backend code.
- Keep an in-memory map in the web process. Rejected because it breaks across restarts and does not work in multi-container development.

### Treat upload completion as parse plus index, not parse only
The web upload route will call rag parse first, persist the returned `ragDocumentId`, then call rag index before promoting the Prisma document status to `INDEXED`.

Rationale:
- Current retrieval expects indexed chunks with the rag-side document ID.
- Marking documents ready after parse alone creates false-positive readiness and leads to runtime chat failures.

Alternatives considered:
- Leave indexing as a manual later step. Rejected because the current product flow exposes uploaded documents immediately for chat.
- Trigger background indexing without tracking readiness. Rejected because the UI would still need a synchronized status contract.

### Gate real rag routes on synchronized indexed documents
The web proxy routes for suggest/chat/compare will resolve Prisma document IDs to backend-ready rag document IDs before forwarding requests. If a document lacks `ragDocumentId` or is not `INDEXED`, the route will return an actionable client error instead of proxying a broken request.

Rationale:
- The failure mode becomes deterministic and understandable.
- The guard lives at the integration boundary where both ID spaces are visible.

Alternatives considered:
- Let rag return not-found or empty retrieval responses. Rejected because the failure cause is on the web-to-rag contract boundary, not in query semantics.

### Support mirror-based embedding configuration in Docker full-stack mode
The rag service compose configuration will accept `HF_ENDPOINT` and `HF_MIRROR` passthrough values and documentation will describe them as the supported path for restricted-network environments.

Rationale:
- The embedding loader already honors these environment variables.
- This keeps the runtime behavior minimal while making the full-stack setup operable where direct access to Hugging Face is blocked.

Alternatives considered:
- Bake models into the Docker image. Rejected for this change because it would drastically increase image size and make the workflow slower.
- Replace local embeddings with a new remote embedding provider. Rejected because that changes retrieval infrastructure rather than fixing the current integration contract.

## Risks / Trade-offs

- [Prisma schema change introduces local database drift] → Mitigation: add the field as optional, run Prisma generation/db sync in the documented startup flow, and keep backward compatibility for existing rows.
- [Index building may noticeably increase upload latency] → Mitigation: keep the synchronous flow for correctness now and surface `PARSING`/`FAILED` states clearly; asynchronous indexing can be a later optimization.
- [Restricted-network users may still lack a valid mirror] → Mitigation: fail with explicit configuration guidance and document the required environment variables for full-stack Docker mode.
- [Older uploaded rows without `ragDocumentId` remain unusable for real chat] → Mitigation: web routes will return actionable sync errors for those rows instead of attempting rag calls with the wrong ID.

## Migration Plan

1. Add the optional Prisma field used to store the rag document ID.
2. Update the upload route to persist the rag document ID and complete rag indexing before marking the document indexed.
3. Update suggest/chat/compare proxy routes to translate from Prisma IDs to rag IDs and reject unsynchronized documents.
4. Update Docker Compose and docs to pass through mirror configuration for embedding model downloads.
5. Recreate the local stack so Prisma schema and container environments pick up the new contract.

Rollback strategy:
- Revert the web route changes and schema field if needed.
- Existing documents without `ragDocumentId` remain readable in the document list because the field is optional.
- Docker environment passthrough is additive and can be removed without data migration.

## Open Questions

- Should the web document model also persist rag-side failure details for display, or is a generic `FAILED` status sufficient for now?
- Should compare mode be updated in the same implementation batch even if the user only reproduces the issue through chat, given it shares the same document identity contract?
