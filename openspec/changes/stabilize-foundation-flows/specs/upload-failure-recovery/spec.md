## ADDED Requirements

### Requirement: Real upload failures must resolve document state
When the upload proxy has already created a `Document` record and the downstream RAG parse flow fails, the system SHALL update the document to a terminal failure state instead of leaving it in `PARSING`.

#### Scenario: Upstream parse returns non-success response
- **WHEN** `POST /api/upload` forwards a file to the real RAG service and receives a non-2xx response
- **THEN** the system SHALL update the document status to `FAILED` and return an error response to the client

#### Scenario: Upstream parse throws before response is returned
- **WHEN** `POST /api/upload` has already created the document record and the downstream fetch or response parsing throws
- **THEN** the system SHALL update the document status to `FAILED` before returning a server error

#### Scenario: Successful parse completes document state
- **WHEN** `POST /api/upload` receives a successful parse response from the real RAG service
- **THEN** the system SHALL update the document status to `INDEXED` and persist returned structure metadata
