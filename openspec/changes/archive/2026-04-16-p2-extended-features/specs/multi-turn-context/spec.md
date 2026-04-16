## ADDED Requirements

### Requirement: History context in chat requests
The system SHALL include recent conversation history when sending chat requests. The `/api/chat` request body SHALL accept an optional `history` field containing an array of `{role, content}` messages.

#### Scenario: History sent with request
- **WHEN** the user sends a follow-up question in a session with prior messages
- **THEN** the request to `/api/chat` SHALL include a `history` array containing the most recent N message pairs (user + assistant), where N is the context window size

#### Scenario: First message has no history
- **WHEN** the user sends the first message in a new session
- **THEN** the `history` field SHALL be an empty array or omitted

### Requirement: Configurable context window
The system SHALL provide a configurable context window size (default: 5 rounds, max: 10 rounds). The user SHALL be able to adjust this value.

#### Scenario: Default context window
- **WHEN** a session starts
- **THEN** the context window size SHALL default to 5 rounds (10 messages: 5 user + 5 assistant)

#### Scenario: Adjust context window
- **WHEN** the user changes the context window size via the context manager UI
- **THEN** subsequent requests SHALL include the updated number of history messages

### Requirement: Context indicator
The system SHALL display a visual indicator showing how many messages are currently included in the context window.

#### Scenario: Context badge
- **WHEN** the user is in a session with messages
- **THEN** a small badge/indicator near the input area SHALL show "上下文: N 轮" (or similar)

#### Scenario: Context exceeds window
- **WHEN** the total messages exceed the context window
- **THEN** the indicator SHALL show that older messages are outside the window (e.g., "上下文: 5/12 轮")

### Requirement: Clear context
The system SHALL allow the user to clear/reset the context within a session, effectively starting a fresh context while keeping message history visible.

#### Scenario: Clear context action
- **WHEN** the user clicks "清除上下文"
- **THEN** the next request SHALL be sent without history, and the indicator SHALL reset; previous messages SHALL remain visible in the chat but SHALL be visually separated by a "context cleared" divider

### Requirement: Route Handler history passthrough
The `/api/chat` Route Handler SHALL forward the `history` field to the Python RAG service when in real mode.

#### Scenario: History forwarded to RAG
- **WHEN** `/api/chat` receives a request with a `history` array and `RAG_SERVICE_URL` is set
- **THEN** the `history` array SHALL be included in the forwarded request to `${RAG_SERVICE_URL}/api/ask`
