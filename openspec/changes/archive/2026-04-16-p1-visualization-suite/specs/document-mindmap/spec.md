## ADDED Requirements

### Requirement: React Flow tree rendering
The system SHALL render the document's `DocumentTreeNode` structure as an interactive tree graph using React Flow. Each node SHALL display the section title and optional summary. Edges SHALL represent parent-child relationships.

#### Scenario: Mindmap displays document structure
- **WHEN** the user opens the "Mindmap" tab for a document that has a structure tree
- **THEN** a React Flow graph SHALL render showing the document hierarchy with the root at top and children below, using automatic tree layout

#### Scenario: No structure tree available
- **WHEN** the document has no structure tree (e.g., not yet parsed)
- **THEN** the mindmap tab SHALL display a message indicating the document structure is not yet available

### Requirement: Expand and collapse subtrees
The system SHALL allow users to expand and collapse subtrees by clicking on nodes. The initial view SHALL show the first 2 levels expanded.

#### Scenario: Collapse a subtree
- **WHEN** the user clicks the collapse control on a node with children
- **THEN** all descendant nodes SHALL be hidden and the edge count SHALL update; the node SHALL show a visual indicator that it has collapsed children

#### Scenario: Expand a collapsed subtree
- **WHEN** the user clicks the expand control on a collapsed node
- **THEN** the direct children SHALL be revealed with their edges

### Requirement: Search highlight in mindmap
The system SHALL highlight nodes in the mindmap that match the current retrieval results (i.e., sections that contained retrieved chunks).

#### Scenario: Highlight retrieved sections
- **WHEN** a question has been answered and retrieval results contain section paths
- **THEN** the mindmap nodes corresponding to those sections SHALL be visually highlighted (e.g., colored border, glow effect)

#### Scenario: Clear highlights on new question
- **WHEN** the user submits a new question
- **THEN** previous highlights SHALL be cleared and new highlights SHALL appear when retrieval results arrive

### Requirement: Node tooltip with summary
Each node SHALL display a tooltip on hover showing the section summary text (if available).

#### Scenario: Hover to see summary
- **WHEN** the user hovers over a node in the mindmap
- **THEN** a tooltip SHALL appear showing the full summary text for that section
