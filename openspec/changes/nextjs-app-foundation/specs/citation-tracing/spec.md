## ADDED Requirements

### Requirement: Inline citation markers
The system SHALL render citation markers (e.g., [1], [2]) inline within the assistant's answer text. Each marker SHALL be visually distinct (e.g., colored badge) and clickable.

#### Scenario: Citations rendered in answer
- **WHEN** the assistant's answer contains citation references
- **THEN** the UI SHALL render each reference as a clickable numbered badge (e.g., [1]) at the corresponding position in the text

### Requirement: Citation detail panel
The system SHALL display a citation detail panel (sidebar or expandable section) showing the source paragraph text, its location in the document hierarchy (chapter > section > paragraph), and a relevance score.

#### Scenario: Click citation to view source
- **WHEN** the user clicks a citation marker [N]
- **THEN** a panel SHALL appear showing: the cited paragraph's full text, its document hierarchy path (e.g., "Chapter 3 > Section 3.2 > Paragraph 5"), and the relevance score from the retrieval engine

#### Scenario: Multiple citations
- **WHEN** the answer contains multiple citations
- **THEN** the citation panel SHALL list all cited sources, each expandable, with the clicked citation highlighted/scrolled-to

### Requirement: Source highlight in document context
The system SHALL provide a way to view the cited text in its broader document context, with the specific cited passage highlighted.

#### Scenario: View in context
- **WHEN** the user clicks "View in context" on a citation detail
- **THEN** the UI SHALL display the surrounding document section with the cited paragraph visually highlighted (e.g., background color change)

### Requirement: Citation summary footer
Each assistant message SHALL display a summary footer listing all citations used, showing the count of unique sources referenced.

#### Scenario: Footer display
- **WHEN** an assistant message with citations finishes streaming
- **THEN** a footer SHALL appear below the message showing "Based on N sources" with expandable source list
