## ADDED Requirements

### Requirement: Score progress bar in citation panel
Each citation in the citation panel SHALL display the relevance score as a horizontal progress bar with color gradient, replacing or supplementing the current "相关度 XX%" text.

#### Scenario: Progress bar rendering
- **WHEN** the citation panel displays a citation with score 0.93
- **THEN** a progress bar SHALL be rendered at 93% width, filled with a green color (high confidence)

#### Scenario: Color gradient mapping
- **WHEN** citations have varying scores
- **THEN** the progress bar color SHALL follow HSL hue mapping: score 0.0-0.4 = red (hue 0), 0.4-0.7 = yellow/amber (hue 40-60), 0.7-1.0 = green (hue 120). The transition SHALL be smooth/continuous.

#### Scenario: Score text preserved
- **WHEN** the progress bar is displayed
- **THEN** the numeric percentage text (e.g., "93%") SHALL still be shown alongside the bar

### Requirement: Inline citation marker color coding
Citation markers (`[1]`, `[2]`) displayed inline in the answer text SHALL have a background color tint reflecting their score level.

#### Scenario: High score marker
- **WHEN** a citation marker `[1]` has score >= 0.7
- **THEN** the marker SHALL have a greenish tint/glow

#### Scenario: Low score marker
- **WHEN** a citation marker `[2]` has score < 0.4
- **THEN** the marker SHALL have a reddish tint/glow

### Requirement: Citation summary with confidence distribution
The citation summary footer ("基于 N 个来源") SHALL include a mini visualization showing the distribution of citation confidence levels.

#### Scenario: Confidence distribution display
- **WHEN** the assistant message has 3+ citations
- **THEN** the footer SHALL display small colored dots or a mini bar chart next to "基于 N 个来源" showing the score distribution (e.g., 2 green dots + 1 yellow dot)

#### Scenario: Single or two citations
- **WHEN** the assistant message has 1-2 citations
- **THEN** the footer SHALL display the colored dots without the chart, keeping it compact

### Requirement: Credibility utility function
The system SHALL provide a shared utility function `getCredibilityColor(score: number): string` that returns an HSL color string for a given score, usable by all citation-related components.

#### Scenario: Consistent coloring
- **WHEN** multiple components render the same citation score
- **THEN** the color SHALL be identical across citation panel, inline marker, and summary footer
