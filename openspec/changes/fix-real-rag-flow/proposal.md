## Why

The current full-stack path reaches the real RAG service, but uploaded documents do not complete a usable retrieval lifecycle. Web and rag persist different document IDs, uploads stop after parsing without building retrieval indexes, and Docker full-stack mode depends on downloading embedding models from external networks that may be unavailable.

## What Changes

- Persist the rag-side document identifier alongside each Prisma document and use that identifier for suggest, ask, compare, and future rag-side document operations.
- Extend the real upload flow so a successful upload completes parse plus index creation before the document is treated as ready for chat.
- Tighten the real chat path so non-indexed or unsynced documents fail with actionable errors instead of producing misleading stream failures.
- Add explicit full-stack configuration support for embedding model access in Docker, including mirror-based configuration for restricted networks.

## Capabilities

### New Capabilities
- `rag-document-sync`: Keep the web document record aligned with the rag document lifecycle, including backend document ID persistence and index readiness tracking.

### Modified Capabilities
- `document-management`: Real uploads must not stop at parsing; they must finish backend indexing and only expose documents as chat-ready after sync succeeds.
- `chat-interface`: Real chat requests must use the rag-backed document identity and surface integration failures as actionable user-visible errors.
- `docker-dev-modes`: Full-stack Docker mode must support embedding model configuration that works in restricted-network development environments.

## Impact

- Affected web routes: `web-app/app/api/upload/route.ts`, `web-app/app/api/chat/route.ts`, `web-app/app/api/suggest/route.ts`, and related document persistence code.
- Affected persistence: Prisma `Document` model and any code that reads or writes document readiness metadata.
- Affected rag integration: parse/index sequencing, backend document lookup assumptions, and Docker environment variables for embedding model access.
- Affected operations: full-stack Docker setup, troubleshooting guidance, and verification of real-mode upload/chat behavior.
