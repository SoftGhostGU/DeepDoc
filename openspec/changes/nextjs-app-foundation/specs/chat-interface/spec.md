## ADDED Requirements

### Requirement: Question input and submission
The system SHALL provide a text input area for the user to type questions about the currently selected document. The input SHALL support Enter to submit and Shift+Enter for newline.

#### Scenario: Submit a question
- **WHEN** the user types a question and presses Enter (or clicks the send button)
- **THEN** the question SHALL be sent to `/api/chat` via POST, the input SHALL be cleared, and the user's message SHALL appear in the chat history

#### Scenario: Empty submission prevented
- **WHEN** the user attempts to submit an empty message
- **THEN** the submission SHALL be prevented and no request SHALL be sent

### Requirement: Streaming answer display
The system SHALL render the assistant's answer in real-time as SSE events arrive. The answer SHALL be rendered as Markdown with proper formatting.

#### Scenario: Token-by-token rendering
- **WHEN** the SSE stream emits `generating` stage events with text tokens
- **THEN** the UI SHALL append each token to the answer display in real-time, creating a typewriter effect

#### Scenario: Stage indicators
- **WHEN** the SSE stream emits stage transition events (analyzing, rewriting, retrieving, generating)
- **THEN** the UI SHALL display the current processing stage to the user (e.g., a status indicator showing "Analyzing query..." -> "Retrieving relevant sections..." -> "Generating answer...")

#### Scenario: Stream error handling
- **WHEN** the SSE connection fails or the stream errors
- **THEN** the UI SHALL display an error message and allow the user to retry the question

### Requirement: Chat history persistence
The system SHALL persist chat messages (both user questions and assistant answers) to the database via ChatSession and ChatMessage models.

#### Scenario: Messages persisted
- **WHEN** a question-answer exchange completes
- **THEN** both the user message and assistant response (including citations) SHALL be saved to the database

#### Scenario: History restored on page load
- **WHEN** the user returns to a previously used chat session
- **THEN** all prior messages SHALL be loaded from the database and displayed in order

### Requirement: Chat session management
The system SHALL support multiple chat sessions per document. The user SHALL be able to create new sessions and switch between existing ones.

#### Scenario: New session creation
- **WHEN** the user clicks "New Chat" for a document
- **THEN** a new empty chat session SHALL be created and set as active

#### Scenario: Session list display
- **WHEN** the user views the chat interface for a document
- **THEN** a sidebar or panel SHALL list all existing chat sessions for that document, ordered by last activity
