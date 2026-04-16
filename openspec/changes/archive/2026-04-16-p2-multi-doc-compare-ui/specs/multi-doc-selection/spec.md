## ADDED Requirements

### Requirement: Multi-document selection entry point
The documents page SHALL provide a "多文档问答" button that opens a document selection dialog.

#### Scenario: Entry button visible
- **WHEN** the user is on the documents page and at least 2 documents have status "INDEXED"
- **THEN** a "多文档问答" button SHALL be visible in the page header area

#### Scenario: Entry button disabled
- **WHEN** fewer than 2 documents have status "INDEXED"
- **THEN** the "多文档问答" button SHALL be disabled with a tooltip explaining the requirement

### Requirement: Document selection dialog
The system SHALL display a dialog with checkboxes for selecting multiple indexed documents.

#### Scenario: Dialog opens
- **WHEN** the user clicks "多文档问答"
- **THEN** a dialog SHALL open showing all documents with INDEXED status, each with a checkbox, document name, page count, and upload date

#### Scenario: Select documents
- **WHEN** the user checks 2 or more documents
- **THEN** the "开始问答" confirmation button SHALL become enabled, showing the count of selected documents

#### Scenario: Non-indexed documents excluded
- **WHEN** the dialog displays documents
- **THEN** documents with status other than INDEXED SHALL NOT be shown or SHALL be shown as disabled/greyed out

#### Scenario: Confirm and navigate
- **WHEN** the user clicks "开始问答" with documents selected
- **THEN** the system SHALL navigate to `/chat/multi?docs=id1,id2,...` with the selected document IDs

### Requirement: Multi-document session creation
The system SHALL create a ChatSession associated with multiple documents.

#### Scenario: Session created on first message
- **WHEN** the user sends the first message in a multi-document chat
- **THEN** a ChatSession SHALL be created with `documentIds` field containing all selected document IDs and `documentId` set to the first document's ID

#### Scenario: Session persists document list
- **WHEN** the multi-doc session is revisited
- **THEN** the session SHALL retain the full list of associated documents
