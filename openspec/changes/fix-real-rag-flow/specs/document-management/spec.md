## MODIFIED Requirements

### Requirement: File upload interface
The system SHALL provide a file upload component that accepts PDF, Markdown (.md), and plain text (.txt) files. The component SHALL display upload progress and file validation feedback. In real rag mode, upload completion SHALL include backend parsing, rag document identifier synchronization, and index creation before the document is marked ready.

#### Scenario: Valid file upload
- **WHEN** the user selects a valid PDF/MD/TXT file and clicks upload
- **THEN** the file SHALL be sent to `/api/upload`, the UI SHALL show upload progress, and upon completion the document SHALL appear in the document list

#### Scenario: Invalid file type rejected
- **WHEN** the user selects a file with an unsupported extension (e.g., .docx, .xlsx)
- **THEN** the UI SHALL display an error message indicating the supported file types and SHALL NOT send the file to the server

#### Scenario: File size validation
- **WHEN** the user selects a file exceeding the maximum allowed size
- **THEN** the UI SHALL display an error message indicating the size limit

#### Scenario: Real upload becomes chat-ready only after indexing
- **WHEN** the application is running in real rag mode and the user uploads a valid document
- **THEN** `/api/upload` SHALL finish rag parsing and rag index creation, persist the rag document identifier on the web document record, and only then mark the document as `INDEXED`

#### Scenario: Real upload failure is not exposed as ready
- **WHEN** rag parsing or rag index creation fails during a real upload
- **THEN** the document SHALL be stored as failed or unavailable for chat and SHALL NOT be shown as ready for question submission

### Requirement: Document list page
The system SHALL display a list/grid of all uploaded documents with their metadata (name, size, upload date, processing status). Each document SHALL be clickable to navigate to the chat interface for that document only when the document is synchronized and ready for rag-backed chat.

#### Scenario: Document list display
- **WHEN** the user navigates to the document management page
- **THEN** the page SHALL display all documents from the database, showing filename, size, upload date, and status (uploading/parsing/indexed/failed)

#### Scenario: Empty state
- **WHEN** no documents have been uploaded
- **THEN** the page SHALL display an empty state with a call-to-action to upload the first document

#### Scenario: Navigate to chat
- **WHEN** the user clicks on an indexed document
- **THEN** the user SHALL be navigated to the chat interface with that document pre-selected

#### Scenario: Unsynchronized document remains blocked
- **WHEN** a document lacks a synchronized rag document identifier or has not completed backend indexing
- **THEN** the document SHALL remain non-ready for real rag chat even if it exists in the list
