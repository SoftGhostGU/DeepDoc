## MODIFIED Requirements

### Requirement: Paragraph heatmap rendering
The system SHALL render a heatmap using ECharts that displays the retrieved paragraphs as rectangular blocks, colored by each paragraph's retrieval relevance score relative to the current result set. Within a given result set, the score with the highest value SHALL map to the warmest color (red), the score with the lowest value SHALL map to the coolest retrieved color (light blue), and intermediate scores SHALL be mapped by min-max normalization of the absolute score into the color bands. When only one paragraph is present or when all scores are equal (`max === min`), the system SHALL use a neutral mid-band color (orange) rather than dividing by zero.

#### Scenario: Heatmap displays after retrieval with varied scores
- **WHEN** a question has been answered and the result set contains paragraphs with different relevance scores
- **THEN** the heatmap SHALL render each paragraph as a block, with the top-scoring paragraph colored red, the bottom-scoring paragraph colored light blue, and the remaining paragraphs colored proportionally along the palette

#### Scenario: Result set contains a single paragraph
- **WHEN** the retrieval returns exactly one paragraph
- **THEN** that paragraph SHALL be colored in the neutral mid-band (orange) so the user does not infer relative ranking from a single datum

#### Scenario: Result set has identical scores
- **WHEN** all retrieved paragraphs share the same absolute score (`max === min`)
- **THEN** all blocks SHALL be rendered in the same mid-band color without triggering a divide-by-zero error

#### Scenario: No retrieval results yet
- **WHEN** the heatmap tab is viewed before any question is submitted
- **THEN** the panel SHALL display an empty-state hint ("提问后查看相关度分布") instead of a colored treemap

### Requirement: Paragraph identification on hover
Each paragraph block in the heatmap SHALL display a tooltip on hover showing the paragraph's index, section path, and the paragraph's **absolute** relevance score (not the normalized position), plus a text preview. Using the absolute score in the tooltip preserves traceability to the underlying retriever output, while the block color conveys relative position within the current result set.

#### Scenario: Hover on a retrieved paragraph
- **WHEN** the user hovers over any block
- **THEN** a tooltip SHALL show: `段落 <index>` · section label, `相关度 XX%` computed from the raw score (not the normalized value), and the first 100 characters of the paragraph text
