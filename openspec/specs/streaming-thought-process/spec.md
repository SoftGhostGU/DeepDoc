## ADDED Requirements

### Requirement: Vertical stage timeline
The system SHALL display a vertical timeline component showing all RAG processing stages (analyzing, rewriting, retrieving_summary, retrieving_paragraphs, generating) as sequential nodes. Each node SHALL display an icon, stage name, and status (pending/active/completed).

#### Scenario: Timeline appears on question submit
- **WHEN** the user submits a question and the SSE stream begins
- **THEN** the timeline SHALL appear with all stages listed, the first stage marked as active, and remaining stages marked as pending

#### Scenario: Stages transition as SSE events arrive
- **WHEN** a new stage SSE event arrives (e.g., `retrieving_summary`)
- **THEN** all prior stages SHALL transition to completed (with checkmark), the current stage SHALL be marked active (with spinner), and remaining stages SHALL stay pending

### Requirement: Stage elapsed time tracking
The system SHALL track and display the elapsed time for each completed stage in the timeline.

#### Scenario: Timer displayed for completed stages
- **WHEN** a stage transitions from active to completed
- **THEN** the stage node SHALL display the elapsed time (e.g., "320ms")

#### Scenario: Active stage shows running timer
- **WHEN** a stage is currently active
- **THEN** the stage node SHALL display a live-updating elapsed counter

### Requirement: Intermediate results expansion
The system SHALL allow completed stages to expand and show their intermediate results: retrieved chunks for `retrieving_summary`, refined paragraphs for `retrieving_paragraphs`.

#### Scenario: Expand retrieval summary stage
- **WHEN** the user clicks on the completed `retrieving_summary` stage node
- **THEN** the node SHALL expand to show the list of retrieved chunks with text snippets and scores

#### Scenario: Expand retrieval paragraphs stage
- **WHEN** the user clicks on the completed `retrieving_paragraphs` stage node
- **THEN** the node SHALL expand to show the refined paragraph list with text and source paths

### Requirement: Timeline embeddable in chat flow
The timeline component SHALL be embeddable within the chat message flow (between user question and assistant answer) and also viewable in the right-side Tab panel.

#### Scenario: Inline timeline during streaming
- **WHEN** the assistant is generating a response
- **THEN** the timeline SHALL appear inline in the chat area above the streaming answer text

#### Scenario: Tab panel view
- **WHEN** the user switches to the "Thought Process" tab in the right panel
- **THEN** the timeline for the most recent question SHALL be displayed in the panel
