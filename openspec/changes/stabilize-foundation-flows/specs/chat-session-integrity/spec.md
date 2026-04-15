## ADDED Requirements

### Requirement: Chat session must belong to the selected document
The system SHALL validate that every chat write operation uses a `ChatSession` belonging to the requested `Document`. A client-provided `session_id` MUST NOT be reused across documents.

#### Scenario: Existing session belongs to requested document
- **WHEN** `POST /api/chat` is called with a `doc_id` and a `session_id` whose `ChatSession.documentId` matches that `doc_id`
- **THEN** the system SHALL append the user and assistant messages to that existing session

#### Scenario: Existing session belongs to a different document
- **WHEN** `POST /api/chat` is called with a `doc_id` and a `session_id` whose `ChatSession.documentId` does not match that `doc_id`
- **THEN** the system SHALL reject the request and SHALL NOT persist any new chat messages to that session

#### Scenario: Missing session is created for current document
- **WHEN** `POST /api/chat` is called with a `doc_id` and no valid `session_id`
- **THEN** the system SHALL create a new `ChatSession` bound to that document before persisting messages
