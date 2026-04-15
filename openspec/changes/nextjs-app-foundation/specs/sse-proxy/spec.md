## ADDED Requirements

### Requirement: SSE passthrough from Python RAG service
The Route Handler at `/api/chat` SHALL proxy SSE events from the Python RAG service's `/api/ask` endpoint to the browser, preserving event types, data payloads, and ordering.

#### Scenario: Transparent SSE proxy
- **WHEN** `/api/chat` receives a POST request and `RAG_SERVICE_URL` is set
- **THEN** the Route Handler SHALL forward the request to `${RAG_SERVICE_URL}/api/ask`, read the SSE response stream, and re-emit each event to the browser with the same `event:` and `data:` fields

#### Scenario: SSE headers set correctly
- **WHEN** the Route Handler responds with an SSE stream
- **THEN** the response SHALL include headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

### Requirement: Compare endpoint proxy
The Route Handler at `/api/compare` SHALL proxy SSE events from the Python RAG service's `/api/compare` endpoint, supporting the dual-track (naive + hierarchical) result stream.

#### Scenario: Compare proxy
- **WHEN** `/api/compare` receives a POST request and `RAG_SERVICE_URL` is set
- **THEN** the Route Handler SHALL forward to `${RAG_SERVICE_URL}/api/compare` and transparently stream all events back to the browser

### Requirement: Upload proxy with file forwarding
The Route Handler at `/api/upload` SHALL receive uploaded files, save them locally, persist metadata to SQLite, and forward the file to the Python RAG service for parsing.

#### Scenario: Upload with real service
- **WHEN** a file is uploaded to `/api/upload` and `RAG_SERVICE_URL` is set
- **THEN** the handler SHALL save the file locally, create a Document record in SQLite, and POST the file as multipart to `${RAG_SERVICE_URL}/api/documents/parse`

#### Scenario: Upload in mock mode
- **WHEN** a file is uploaded to `/api/upload` and `RAG_SERVICE_URL` is not set
- **THEN** the handler SHALL save the file locally, create a Document record in SQLite, and return mock parse results

### Requirement: Documents list endpoint
The Route Handler at `/api/documents` SHALL return the list of documents from the SQLite database.

#### Scenario: List documents
- **WHEN** GET `/api/documents` is called
- **THEN** the handler SHALL query all Document records from SQLite and return them as a JSON array

### Requirement: History endpoint
The Route Handler at `/api/history` SHALL return chat session history for a given document.

#### Scenario: Get session history
- **WHEN** GET `/api/history?documentId=xxx` is called
- **THEN** the handler SHALL return all ChatSessions and their ChatMessages for the specified document
