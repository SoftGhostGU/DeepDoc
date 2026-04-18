## MODIFIED Requirements

### Requirement: React Flow tree rendering
The system SHALL render the current document's `DocumentTreeNode` structure as an interactive tree graph using React Flow. Each node SHALL display the section title and optional summary; edges SHALL represent parent-child relationships. The mindmap MUST render the structure of the **currently selected user document** and MUST NOT fall back to any hard-coded mock tree (for example, the `mockDocumentTree` used elsewhere for demo purposes).

#### Scenario: Mindmap displays real document structure
- **WHEN** the user opens the "导图" tab for a document whose `structureTree` is populated
- **THEN** a React Flow graph SHALL render the hierarchy of that document, with the root at top and children below, using automatic tree layout

#### Scenario: No structure tree available
- **WHEN** the current document has no `structureTree` (e.g., not yet parsed or parsing failed)
- **THEN** the mindmap SHALL display a clear empty-state message such as "该文档未产出结构树" and SHALL NOT render any mock/placeholder document tree

#### Scenario: Mock data must not appear in mindmap
- **WHEN** the mindmap is rendered in any environment (development, staging, production)
- **THEN** the component SHALL NOT accept `mockDocumentTree` (or any other constant tree) as a fallback input; the only permitted input is the selected document's own `structureTree`, or `null` (empty state)
