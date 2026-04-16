## ADDED Requirements

### Requirement: Stage timing bar chart
The system SHALL display a horizontal bar chart showing the elapsed time of each RAG stage (analyzing, rewriting, retrieving_summary, retrieving_paragraphs, generating) for the most recent question.

#### Scenario: Bar chart renders after completion
- **WHEN** a question-answer exchange completes with stage timestamps available
- **THEN** a horizontal bar chart SHALL render with one bar per stage, labeled with the stage name and elapsed milliseconds

#### Scenario: No data available
- **WHEN** the performance tab is viewed before any question is asked
- **THEN** a placeholder message "Ask a question to see performance metrics" SHALL be displayed

### Requirement: Retrieval hit summary
The system SHALL display retrieval metrics: number of chunks retrieved at summary level, number of paragraphs refined, and the score range (min/max/avg) of retrieved chunks.

#### Scenario: Metrics displayed
- **WHEN** retrieval results are available
- **THEN** the dashboard SHALL display: "Summary chunks: N", "Refined paragraphs: M", "Score range: X% - Y% (avg Z%)"

### Requirement: Token generation speed
The system SHALL calculate and display the token generation speed (tokens per second) based on the generating stage duration and the number of tokens received.

#### Scenario: Speed displayed
- **WHEN** the generating stage completes
- **THEN** the dashboard SHALL display "Generation speed: N tokens/sec"

### Requirement: Total latency breakdown
The system SHALL display the total end-to-end latency (from question submit to final answer) with a visual breakdown showing what percentage each stage consumed.

#### Scenario: Latency pie/donut chart
- **WHEN** a question-answer exchange completes
- **THEN** a donut chart or stacked bar SHALL render showing each stage's percentage of total latency, with total time displayed in the center/beside
