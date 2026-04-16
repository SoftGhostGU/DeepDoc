## ADDED Requirements

### Requirement: Rag document identity shall be persisted for real uploads
The system SHALL persist the rag-side document identifier returned by the real parse flow on the corresponding web `Document` record.

#### Scenario: Parse response is linked to Prisma document
- **WHEN** a real upload completes rag parsing successfully
- **THEN** the web application SHALL store the returned rag document identifier on the created Prisma document before the document is exposed as chat-ready

#### Scenario: Existing unsynced document is detected
- **WHEN** a real-mode route receives a Prisma document that does not have a stored rag document identifier
- **THEN** the route SHALL reject the request with an actionable synchronization error instead of forwarding the Prisma document identifier to the rag service

### Requirement: Rag readiness shall require completed backend indexing
The system SHALL treat a document as rag-ready only after the backend parse and index steps have both succeeded for the stored rag document identifier.

#### Scenario: Successful sync marks document ready
- **WHEN** rag parse succeeds and rag index creation succeeds for the stored rag document identifier
- **THEN** the Prisma document SHALL transition to `INDEXED` and SHALL be eligible for suggest and chat requests

#### Scenario: Indexing failure keeps document unavailable
- **WHEN** rag parse succeeds but rag indexing fails
- **THEN** the Prisma document SHALL NOT be treated as chat-ready and the upload flow SHALL report a backend processing failure
