## ADDED Requirements

### Requirement: Citation panel must follow the selected assistant message
The citation detail panel SHALL render citations for the assistant message currently selected by the user, not globally for the most recent response.

#### Scenario: User opens citation from an older answer
- **WHEN** the chat contains multiple assistant answers with different citation sets and the user clicks a citation marker in an older answer
- **THEN** the citation panel SHALL display the citations belonging to that older answer and highlight the clicked citation

#### Scenario: User switches between answers with different citations
- **WHEN** the user selects citations from two different assistant answers in sequence
- **THEN** the citation panel SHALL replace its source list with the citations from the newly selected answer

#### Scenario: Default panel state uses the active answer context
- **WHEN** no older answer has been explicitly selected and the latest assistant answer includes citations
- **THEN** the citation panel SHALL default to that latest answer's citations
