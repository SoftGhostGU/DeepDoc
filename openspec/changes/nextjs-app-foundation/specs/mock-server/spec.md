## ADDED Requirements

### Requirement: Mock data conforming to API contract
The Mock Server SHALL return responses that conform to the interface contract defined in the product document (Section 3.2). Mock data SHALL cover: document parse response, index build response, document tree, paragraphs list, retrieval results, and streaming ask/compare responses.

#### Scenario: Mock document parse
- **WHEN** POST `/api/upload` is called in Mock mode with a file
- **THEN** the response SHALL return a JSON object with `doc_id`, `structure_tree` (sample hierarchical structure), and `stats` (page count, paragraph count, etc.)

#### Scenario: Mock document list
- **WHEN** GET `/api/documents` is called in Mock mode
- **THEN** the response SHALL return an array of document objects with metadata fields matching the Document model

### Requirement: SSE stream simulation
The Mock Server SHALL simulate SSE event streams for the `/api/chat` and `/api/compare` endpoints, emitting stage events with realistic delays between stages.

#### Scenario: Mock chat stream
- **WHEN** POST `/api/chat` is called in Mock mode
- **THEN** the response SHALL be an SSE stream emitting events in order: `analyzing` (200ms delay) -> `rewriting` (300ms delay) -> `retrieving_summary` (500ms delay) -> `retrieving_paragraphs` (400ms delay) -> `generating` (token-by-token with 30-50ms intervals) -> final answer with citations

#### Scenario: Mock compare stream
- **WHEN** POST `/api/compare` is called in Mock mode
- **THEN** the response SHALL be an SSE stream emitting two parallel result tracks (naive RAG and hierarchical RAG) with simulated timing differences

### Requirement: Mock mode toggle
The Mock Server SHALL activate when the `RAG_SERVICE_URL` environment variable is unset or empty. No code changes SHALL be required to switch between Mock and real mode.

#### Scenario: Seamless switch to real service
- **WHEN** `RAG_SERVICE_URL` is changed from empty to `http://localhost:8000` and the server is restarted
- **THEN** all Route Handlers SHALL proxy to the real Python RAG service instead of returning mock data
