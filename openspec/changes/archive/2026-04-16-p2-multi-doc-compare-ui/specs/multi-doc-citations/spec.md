## ADDED Requirements

### Requirement: Citation source document identification
Each citation in a multi-document response SHALL clearly identify which document it comes from.

#### Scenario: Inline citation with document label
- **WHEN** an assistant message contains citations from multiple documents
- **THEN** each inline citation marker (e.g., `[1]`) SHALL be accompanied by a short document identifier (e.g., a colored dot or abbreviated document name)

#### Scenario: Citation color coding by document
- **WHEN** citations come from different documents
- **THEN** each document SHALL be assigned a distinct color, and all citations from the same document SHALL share that color in both inline markers and the citation panel

### Requirement: Citation panel document grouping
The citation panel SHALL group citations by source document in multi-document mode.

#### Scenario: Grouped display
- **WHEN** the citation panel shows citations from a multi-doc query
- **THEN** citations SHALL be grouped under document name headers, with each group collapsible/expandable (Accordion-style)

#### Scenario: Document group header
- **WHEN** a document group is displayed in the citation panel
- **THEN** the header SHALL show the document name, its assigned color indicator, and the count of citations from that document

#### Scenario: Single document fallback
- **WHEN** all citations come from a single document (even in multi-doc mode)
- **THEN** the citation panel SHALL display citations without grouping, same as single-doc mode

### Requirement: Citation summary footer multi-doc
The citation summary footer SHALL indicate the number of source documents when in multi-document mode.

#### Scenario: Multi-doc footer text
- **WHEN** citations come from 3 documents
- **THEN** the footer SHALL display text like "基于 N 个来源，来自 3 份文档" with colored dots representing each document

#### Scenario: Single-doc footer unchanged
- **WHEN** citations come from only 1 document
- **THEN** the footer SHALL display the existing format "基于 N 个来源" without document count
