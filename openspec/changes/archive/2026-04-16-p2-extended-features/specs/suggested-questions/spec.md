## ADDED Requirements

### Requirement: Suggest API endpoint
The system SHALL provide a `/api/suggest` Route Handler that accepts a `doc_id` and returns a list of 3-5 suggested questions. In Mock mode, it SHALL return fixed questions relevant to the mock document. In real mode, it SHALL forward to the Python RAG service.

#### Scenario: Mock mode suggest
- **WHEN** GET `/api/suggest?docId=xxx` is called in Mock mode
- **THEN** the response SHALL return a JSON array of 3-5 suggested question strings in Chinese

#### Scenario: Real mode suggest
- **WHEN** GET `/api/suggest?docId=xxx` is called with `RAG_SERVICE_URL` set
- **THEN** the request SHALL be forwarded to `${RAG_SERVICE_URL}/api/suggest`

### Requirement: Suggested questions display
The system SHALL display suggested question chips/buttons in the chat interface when no messages exist in the current session. Clicking a suggested question SHALL submit it as if the user typed and sent it.

#### Scenario: Show suggestions on empty chat
- **WHEN** the user enters a chat session with no messages
- **THEN** 3-5 suggested question chips SHALL be displayed below the empty state message

#### Scenario: Click suggested question
- **WHEN** the user clicks a suggested question chip
- **THEN** the question SHALL be submitted as a user message and the SSE stream SHALL begin

#### Scenario: Hide after first message
- **WHEN** the user sends any message (typed or suggested)
- **THEN** the suggested question chips SHALL disappear

### Requirement: Document overview card
The system SHALL display a document overview/summary card at the top of the chat interface showing the document name, page count, section count, and a brief summary when available.

#### Scenario: Overview card displayed
- **WHEN** the user opens a chat for an indexed document
- **THEN** a compact overview card SHALL display the document's name, stats (pages, sections, paragraphs), and the root-level summary from the structure tree

#### Scenario: No summary available
- **WHEN** the document has no structure tree or summary
- **THEN** the overview card SHALL show only the document name and file stats (size, upload date)
