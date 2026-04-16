## ADDED Requirements

### Requirement: Multi-document chat page
The system SHALL provide a chat page at `/chat/multi` that supports querying across multiple documents.

#### Scenario: Page loads with document context
- **WHEN** the user navigates to `/chat/multi?docs=id1,id2,id3`
- **THEN** the page SHALL display a chat interface with a header showing all selected document names and the session sidebar listing multi-doc sessions

#### Scenario: Chat header displays documents
- **WHEN** the multi-doc chat page is active
- **THEN** the header SHALL show document name chips/badges for each selected document, distinguishable by color coding

### Requirement: Multi-document Route Handler
The system SHALL provide an API endpoint that forwards multi-document queries to the Python RAG service.

#### Scenario: Mock mode multi-doc chat
- **WHEN** POST `/api/chat` receives a request with `doc_ids` array (multiple IDs) in Mock mode
- **THEN** the system SHALL return a mock SSE stream containing citations from multiple simulated documents

#### Scenario: Real mode multi-doc chat
- **WHEN** POST `/api/chat` receives a request with `doc_ids` array and `RAG_SERVICE_URL` is set
- **THEN** the system SHALL forward the request to `${RAG_SERVICE_URL}/api/ask` with the `doc_ids` field

#### Scenario: Backward compatible single-doc
- **WHEN** POST `/api/chat` receives a request with a single `doc_id` (existing format)
- **THEN** the system SHALL continue to work as before with no behavior change

### Requirement: Chat store multi-doc support
The chat-store SHALL support sessions associated with multiple documents.

#### Scenario: Multi-doc session state
- **WHEN** a multi-doc session is active
- **THEN** the chat-store SHALL track the session under a composite key or the first document's ID, and expose the full `documentIds` list

#### Scenario: Send message with multi-doc context
- **WHEN** `sendMessage` is called in a multi-doc session
- **THEN** the request body SHALL include `doc_ids` array instead of single `doc_id`

### Requirement: Multi-document mock data
The mock system SHALL simulate multi-document responses with citations from different documents.

#### Scenario: Mock multi-doc citations
- **WHEN** a multi-doc mock SSE stream is generated
- **THEN** the citations SHALL include `documentId` and `documentName` fields identifying which document each citation comes from, with at least 2 different source documents represented

#### Scenario: Mock answer references multiple sources
- **WHEN** a multi-doc mock answer is generated
- **THEN** the answer text SHALL contain inline citation markers referencing sources from different documents (e.g., `[1]` from doc A, `[2]` from doc B)
