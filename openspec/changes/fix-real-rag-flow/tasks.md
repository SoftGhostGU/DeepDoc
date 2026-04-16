## 1. Prisma Document Sync Model

- [ ] 1.1 Add an optional `ragDocumentId` field to the Prisma `Document` model and regenerate the Prisma client
- [ ] 1.2 Update server-side document typings and queries so web routes can read the synchronized rag document ID
- [ ] 1.3 Ensure existing documents without `ragDocumentId` remain readable while being treated as not ready for real rag requests

## 2. Real Upload and Index Lifecycle

- [ ] 2.1 Refactor `web-app/app/api/upload/route.ts` to capture the rag-side `doc_id` returned by `/api/documents/parse`
- [ ] 2.2 Extend the real upload path to call rag indexing after parse succeeds and before the Prisma document is marked `INDEXED`
- [ ] 2.3 Persist `ragDocumentId`, `structureTree`, `pageCount`, and final readiness state only after parse-plus-index succeeds
- [ ] 2.4 Ensure parse or index failures move the Prisma document into a non-ready failed state and return actionable errors

## 3. Real Route Identity Guards

- [ ] 3.1 Update `web-app/app/api/chat/route.ts` to resolve requested Prisma document IDs into synchronized rag document IDs before forwarding requests
- [ ] 3.2 Reject chat requests for documents that are missing `ragDocumentId` or are not `INDEXED`, using a clear 4xx integration error
- [ ] 3.3 Update `web-app/app/api/suggest/route.ts` to use the synchronized rag document ID and the same readiness guard
- [ ] 3.4 Update `web-app/app/api/compare/route.ts` to use synchronized rag document IDs and reject unsynchronized documents consistently

## 4. Docker Full-Stack Embedding Configuration

- [ ] 4.1 Update `docker-compose.yml` so the rag service accepts `HF_ENDPOINT` and `HF_MIRROR` passthrough values in full-stack mode
- [ ] 4.2 Document the restricted-network full-stack setup in `README.md`, including the required embedding mirror variables
- [ ] 4.3 Ensure the existing mock-only compose path remains unchanged while the full-stack path gains the new embedding configuration support

## 5. Verification

- [ ] 5.1 Recreate the full Docker stack and verify the web container receives the synchronized rag configuration and optional mirror variables
- [ ] 5.2 Upload a document in real mode and confirm the resulting Prisma row is only marked `INDEXED` after rag parse plus index succeed
- [ ] 5.3 Verify `/api/suggest`, `/api/chat`, and `/api/compare` succeed for synchronized documents and fail clearly for unsynchronized ones
- [ ] 5.4 Reproduce the restricted-network embedding setup path and confirm configuration errors are actionable instead of surfacing only opaque closed-client stream failures
