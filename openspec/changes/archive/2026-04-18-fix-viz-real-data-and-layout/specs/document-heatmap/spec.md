## MODIFIED Requirements

### Requirement: Paragraph heatmap rendering
The system SHALL render a heatmap using ECharts treemap that displays the paragraphs retrieved for the current question, colored by their retrieval relevance score (0.0 to 1.0). The data source for the heatmap SHALL be the SSE-delivered `retrievedParagraphs` (each item carrying its own `score`), NOT a globally persisted paragraph list or any mock data. Higher scores SHALL map to warmer colors (red/orange), lower to cooler colors (blue), and zero-score items SHALL remain neutral gray but retain a minimum visible baseline size.

#### Scenario: Heatmap displays retrieved paragraphs after query
- **WHEN** a question has been answered and `retrievedParagraphs` is non-empty
- **THEN** the heatmap SHALL render one block per retrieved paragraph, colored by that paragraph's `score` field from the SSE payload

#### Scenario: Heatmap before any question
- **WHEN** the heatmap tab is viewed before any question has been asked
- **THEN** the heatmap SHALL display an inviting empty state (e.g., "提问后查看相关度分布") rather than rendering mock data

#### Scenario: Mock data must not appear in heatmap
- **WHEN** the heatmap is rendered in any environment (development, staging, production)
- **THEN** the component SHALL NOT fall back to `mockParagraphs` or any constant mock paragraph list; the only permitted data source is the current session's `retrievedParagraphs`

#### Scenario: Zero-score paragraph remains visible
- **WHEN** retrieval returns a paragraph with score = 0
- **THEN** that paragraph SHALL still appear as a neutral gray block with a minimum baseline size (not zero area)

### Requirement: Paragraph identification on hover
Each paragraph block in the heatmap SHALL display a tooltip on hover showing the paragraph's real index (as provided by the SSE event, see retrieval-path-visualization), section title (from `sectionTitleMap` built from `Document.structureTree`), relevance score, and a text preview. The tooltip MUST correctly handle paragraphs whose `index` equals 0.

#### Scenario: Hover shows score from SSE event
- **WHEN** the user hovers over a paragraph block
- **THEN** the tooltip SHALL show the score carried on that paragraph (e.g., "相关度 73%"), read from the paragraph's own `score` field — not from a separate chunks map

#### Scenario: Hover shows real section title
- **WHEN** the user hovers over a paragraph block whose `node_id` exists in the `sectionTitleMap`
- **THEN** the tooltip SHALL display the human-readable section title, not the raw node id

#### Scenario: Paragraph with index 0
- **WHEN** the user hovers over a paragraph whose `index` is 0
- **THEN** the tooltip SHALL render the full tooltip contents (index, section, score, preview), not fall back to showing only the section name

### Requirement: Section grouping
Paragraph blocks SHALL be visually grouped by their parent section using the human-readable section title (from `Document.structureTree`). Unknown sections SHALL be grouped under a single "未分类" label.

#### Scenario: Sections visually separated with real titles
- **WHEN** the heatmap renders
- **THEN** paragraphs from the same section SHALL be grouped together and the group header SHALL display the section's real title, not its internal id

### Requirement: Click to view paragraph
Clicking a paragraph block SHALL highlight the corresponding citation in the citation panel when the clicked paragraph's id matches a `citation.paragraph_id` in the current message's citations.

#### Scenario: Click retrieved paragraph
- **WHEN** the user clicks a paragraph block whose id matches a citation
- **THEN** the citation panel SHALL scroll to and highlight that citation

#### Scenario: Click on paragraph with no matching citation
- **WHEN** the user clicks a paragraph block whose id does not match any citation
- **THEN** the click SHALL be silently ignored (no error, no visible state change)
