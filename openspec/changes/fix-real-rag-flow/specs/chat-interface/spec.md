## MODIFIED Requirements

### Requirement: Question input and submission
The system SHALL provide a text input area for the user to type questions about the currently selected document. The input SHALL support Enter to submit and Shift+Enter for newline. In real rag mode, submission SHALL resolve the selected web document to its synchronized rag document identifier before proxying the question.

#### Scenario: Submit a question
- **WHEN** the user types a question and presses Enter (or clicks the send button)
- **THEN** the question SHALL be sent to `/api/chat` via POST, the input SHALL be cleared, and the user's message SHALL appear in the chat history

#### Scenario: Empty submission prevented
- **WHEN** the user attempts to submit an empty message
- **THEN** the submission SHALL be prevented and no request SHALL be sent

#### Scenario: Real-mode question uses synchronized rag identity
- **WHEN** the selected document is indexed and synchronized for real rag mode
- **THEN** `/api/chat` SHALL forward the synchronized rag document identifier to the rag service instead of the Prisma document identifier

#### Scenario: Unsynchronized document submission is rejected
- **WHEN** the selected document is not synchronized or not indexed for real rag mode
- **THEN** `/api/chat` SHALL reject the request with an actionable document-readiness error and SHALL NOT open a misleading rag stream

### Requirement: Streaming answer display
The system SHALL render the assistant's answer in real-time as SSE events arrive. The answer SHALL be rendered as Markdown with proper formatting, and real-mode integration failures SHALL surface actionable error messages instead of opaque downstream transport errors.

#### Scenario: Token-by-token rendering
- **WHEN** the SSE stream emits `generating` stage events with text tokens
- **THEN** the UI SHALL append each token to the answer display in real-time, creating a typewriter effect

#### Scenario: Stage indicators
- **WHEN** the SSE stream emits stage transition events (analyzing, rewriting, retrieving, generating)
- **THEN** the UI SHALL display the current processing stage to the user (e.g., a status indicator showing "Analyzing query..." -> "Retrieving relevant sections..." -> "Generating answer...")

#### Scenario: Stream error handling
- **WHEN** the SSE connection fails or the stream errors
- **THEN** the UI SHALL display an error message and allow the user to retry the question

#### Scenario: Real-mode setup failure is actionable
- **WHEN** the real rag pipeline fails because the selected document is unsynchronized or the backend embedding setup is incomplete
- **THEN** the SSE error shown to the user SHALL identify the integration/setup problem instead of only surfacing a generic closed-client transport error
