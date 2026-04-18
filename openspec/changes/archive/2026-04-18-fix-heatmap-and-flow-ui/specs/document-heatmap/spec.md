## MODIFIED Requirements

### Requirement: Paragraph heatmap rendering
The system SHALL render a heatmap using ECharts treemap that displays the current document's real paragraphs as rectangular blocks, colored by their retrieval relevance score (0.0 to 1.0). Higher scores SHALL map to warmer colors (e.g., red/orange), lower scores to cooler colors (e.g., blue), and non-retrieved paragraphs SHALL be neutral gray. The heatmap MUST NOT render mocked/hard-coded paragraphs in production; paragraph data SHALL come from the active `Document`. Paragraphs with relevance score = 0 SHALL still occupy a minimum visible area (baseline size) so the overall paragraph layout remains readable.

#### Scenario: Heatmap displays after retrieval
- **WHEN** a question has been answered and retrieval results are available for the current document
- **THEN** the heatmap SHALL render all paragraphs of the **current document** as blocks, with retrieved paragraphs colored according to their relevance score

#### Scenario: No retrieval results yet
- **WHEN** the heatmap tab is viewed before any question is submitted
- **THEN** all paragraph blocks SHALL be neutral gray with a hint message "提问后查看相关度分布"

#### Scenario: Zero-score paragraph remains visible
- **WHEN** the heatmap renders with retrieval results and some paragraphs have score = 0
- **THEN** those paragraphs SHALL still be displayed as neutral gray blocks with a minimum baseline size (not collapsed to zero area)

#### Scenario: Document has no paragraph data
- **WHEN** the active document has not yet produced paragraph data
- **THEN** the heatmap SHALL display a friendly empty state message (e.g., "段落数据尚未就绪") instead of rendering mocked data

### Requirement: Paragraph identification on hover
Each paragraph block in the heatmap SHALL display a tooltip on hover showing the paragraph's index, section path (real section title from the document structure), relevance score (if retrieved), and a text preview. The tooltip MUST correctly handle paragraphs whose `index` equals 0 (not treat index 0 as missing data).

#### Scenario: Hover on retrieved paragraph
- **WHEN** the user hovers over a colored (retrieved) paragraph block
- **THEN** a tooltip SHALL show: paragraph index, section title (e.g., "第二章 系统设计 > 2.1 检索策略"), relevance score (e.g., "相关度: 93%"), and the first 100 characters of text

#### Scenario: Hover on non-retrieved paragraph
- **WHEN** the user hovers over a gray (non-retrieved) paragraph block
- **THEN** a tooltip SHALL show: paragraph index, section title, and "未检索" label

#### Scenario: Paragraph with index 0
- **WHEN** the user hovers over a paragraph block whose index is 0
- **THEN** the tooltip SHALL render the full paragraph tooltip (index, section, score/label, preview), not fall back to the section name

### Requirement: Section grouping
Paragraph blocks SHALL be visually grouped by their parent section. The label displayed for each group SHALL be the section's real human-readable title (as stored in `Document.structureTree`), NOT the raw internal node identifier.

#### Scenario: Sections visually separated with real titles
- **WHEN** the heatmap renders
- **THEN** paragraphs from the same section SHALL be grouped together and the group header SHALL display the section's title (e.g., "1.1 现有痛点"), not its internal id (e.g., "sec-1-1")

#### Scenario: Paragraph without section metadata
- **WHEN** a paragraph has no `node_id` or an unknown section
- **THEN** it SHALL be placed under a group labeled "未分类" (or similar fallback) rather than the literal string "unknown"

### Requirement: Click to view paragraph
The system SHALL allow clicking a paragraph block in the heatmap to highlight the corresponding citation (if it exists) in the citation panel. The click mapping MUST use the real paragraph's stable `id` (matching the `paragraph_id` field on retrieved citations), so clicks in production resolve to the correct citation.

#### Scenario: Click retrieved paragraph
- **WHEN** the user clicks a retrieved paragraph block
- **THEN** the citation panel SHALL scroll to and highlight the corresponding citation by matching the block's paragraph id to `citation.paragraph_id`

#### Scenario: Click on paragraph with no citation
- **WHEN** the user clicks a paragraph block that has no matching citation
- **THEN** the click SHALL be silently ignored (no error, no state change)
