## ADDED Requirements

### Requirement: Paragraph heatmap rendering
The system SHALL render a heatmap using ECharts that displays the document's paragraphs as rectangular blocks, colored by their retrieval relevance score (0.0 to 1.0). Higher scores SHALL map to warmer colors (e.g., red/orange), lower scores to cooler colors (e.g., blue/gray), and non-retrieved paragraphs SHALL be neutral gray.

#### Scenario: Heatmap displays after retrieval
- **WHEN** a question has been answered and retrieval results are available
- **THEN** the heatmap SHALL render all document paragraphs as blocks, with retrieved paragraphs colored according to their relevance score

#### Scenario: No retrieval results yet
- **WHEN** the heatmap tab is viewed before any question is submitted
- **THEN** all paragraph blocks SHALL be neutral gray with a hint message "Ask a question to see relevance distribution"

### Requirement: Paragraph identification on hover
Each paragraph block in the heatmap SHALL display a tooltip on hover showing the paragraph's index, section path, relevance score (if retrieved), and a text preview.

#### Scenario: Hover on retrieved paragraph
- **WHEN** the user hovers over a colored (retrieved) paragraph block
- **THEN** a tooltip SHALL show: paragraph index, section path (e.g., "Chapter 2 > Section 2.1"), relevance score (e.g., "Score: 93%"), and the first 100 characters of text

#### Scenario: Hover on non-retrieved paragraph
- **WHEN** the user hovers over a gray (non-retrieved) paragraph block
- **THEN** a tooltip SHALL show: paragraph index, section path, and "Not retrieved" label

### Requirement: Click to view paragraph
The system SHALL allow clicking a paragraph block in the heatmap to highlight the corresponding citation (if it exists) in the citation panel.

#### Scenario: Click retrieved paragraph
- **WHEN** the user clicks a retrieved paragraph block
- **THEN** the citation panel SHALL scroll to and highlight the corresponding citation

### Requirement: Section grouping
Paragraph blocks SHALL be visually grouped by their parent section, with section labels displayed above or beside each group.

#### Scenario: Sections visually separated
- **WHEN** the heatmap renders
- **THEN** paragraphs from the same section SHALL be grouped together with a visible section header/divider
