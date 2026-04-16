## ADDED Requirements

### Requirement: Split-screen layout
The system SHALL provide a dedicated comparison page with a left-right split layout. The left panel SHALL show the naive RAG result and the right panel SHALL show the hierarchical RAG result. Both panels SHALL stream simultaneously.

#### Scenario: Compare page renders
- **WHEN** the user navigates to the compare page for a document
- **THEN** a split-screen layout SHALL be displayed with labeled panels ("Naive RAG" and "Hierarchical RAG") and a shared question input at the bottom

### Requirement: Dual-track SSE consumption
The system SHALL consume the `/api/compare` SSE stream, routing `compare_track` events to the appropriate panel based on the `track` field ("naive" or "hierarchical").

#### Scenario: Tokens routed to correct panel
- **WHEN** the SSE stream emits a `compare_track` event with `track: "naive"` and a token
- **THEN** the token SHALL be appended to the naive panel's answer display

#### Scenario: Both tracks stream simultaneously
- **WHEN** the user submits a comparison question
- **THEN** both panels SHALL begin streaming independently, showing their respective stage indicators and accumulating tokens

#### Scenario: Track completion
- **WHEN** a `compare_track` event with `done: true` arrives for a track
- **THEN** that panel SHALL display the final answer with citations, while the other track may still be streaming

### Requirement: Per-track citations
Each panel SHALL display its own citation list below the answer, showing citations specific to that RAG mode.

#### Scenario: Citations displayed per track
- **WHEN** both tracks complete
- **THEN** the naive panel SHALL show its citations and the hierarchical panel SHALL show its citations, allowing visual comparison of citation quality and count

### Requirement: Comparison entry from document list
The document list page SHALL provide a "Compare" button/link for each indexed document, navigating to the compare page.

#### Scenario: Navigate to compare mode
- **WHEN** the user clicks "Compare" on an indexed document in the document list
- **THEN** the user SHALL be navigated to `/compare/{documentId}`

### Requirement: Compare store
The system SHALL use a dedicated Zustand store (`compare-store`) to manage the dual-track streaming state, separate from the main chat-store.

#### Scenario: Independent state management
- **WHEN** a comparison is in progress
- **THEN** the compare-store SHALL track: naive answer text, hierarchical answer text, naive citations, hierarchical citations, naive streaming status, hierarchical streaming status, and any errors
