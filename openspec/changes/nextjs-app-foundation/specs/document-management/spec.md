## ADDED Requirements

### Requirement: File upload interface
The system SHALL provide a file upload component that accepts PDF, Markdown (.md), and plain text (.txt) files. The component SHALL display upload progress and file validation feedback.

#### Scenario: Valid file upload
- **WHEN** the user selects a valid PDF/MD/TXT file and clicks upload
- **THEN** the file SHALL be sent to `/api/upload`, the UI SHALL show upload progress, and upon completion the document SHALL appear in the document list

#### Scenario: Invalid file type rejected
- **WHEN** the user selects a file with an unsupported extension (e.g., .docx, .xlsx)
- **THEN** the UI SHALL display an error message indicating the supported file types and SHALL NOT send the file to the server

#### Scenario: File size validation
- **WHEN** the user selects a file exceeding the maximum allowed size
- **THEN** the UI SHALL display an error message indicating the size limit

### Requirement: Document list page
The system SHALL display a list/grid of all uploaded documents with their metadata (name, size, upload date, processing status). Each document SHALL be clickable to navigate to the chat interface for that document.

#### Scenario: Document list display
- **WHEN** the user navigates to the document management page
- **THEN** the page SHALL display all documents from the database, showing filename, size, upload date, and status (uploading/parsing/indexed/failed)

#### Scenario: Empty state
- **WHEN** no documents have been uploaded
- **THEN** the page SHALL display an empty state with a call-to-action to upload the first document

#### Scenario: Navigate to chat
- **WHEN** the user clicks on an indexed document
- **THEN** the user SHALL be navigated to the chat interface with that document pre-selected

### Requirement: Document deletion
The system SHALL allow users to delete documents. Deletion SHALL remove the document metadata from SQLite and clean up the uploaded file.

#### Scenario: Delete a document
- **WHEN** the user clicks the delete button on a document and confirms
- **THEN** the document SHALL be removed from the database, the file SHALL be deleted from storage, and the document list SHALL update
