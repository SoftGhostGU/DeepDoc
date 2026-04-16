## ADDED Requirements

### Requirement: Retrieval flow graph
The system SHALL render a directed flow graph using React Flow that visualizes the retrieval pipeline: Query → Analyze → Rewrite → Summary Recall → Paragraph Refine → Generate → Answer. Each step SHALL be a node in the flow.

#### Scenario: Flow graph layout
- **WHEN** the user opens the "Retrieval Path" tab
- **THEN** a left-to-right (or top-to-bottom) directed graph SHALL be rendered with nodes for each retrieval stage connected by edges

### Requirement: Progressive node activation
Nodes in the flow graph SHALL activate progressively as SSE stage events arrive, creating an animation effect of the retrieval "flowing" through the pipeline.

#### Scenario: Node lights up on stage event
- **WHEN** an SSE stage event for `retrieving_summary` arrives
- **THEN** the corresponding node SHALL transition from inactive (gray) to active (highlighted color with animation), and the edge leading to it SHALL animate

#### Scenario: All nodes lit after completion
- **WHEN** the final SSE event arrives
- **THEN** all nodes in the flow SHALL be in completed state, forming a fully illuminated path

### Requirement: Chunk display on retrieval nodes
The retrieval nodes (summary recall and paragraph refine) SHALL display the retrieved chunks as sub-elements or expandable lists within or adjacent to the node.

#### Scenario: Chunks attached to summary node
- **WHEN** the `retrieval_summary` SSE event delivers chunks
- **THEN** the summary recall node SHALL display the retrieved chunk count and allow expanding to see chunk text snippets and scores

#### Scenario: Paragraphs attached to paragraph node
- **WHEN** the `retrieval_paragraphs` SSE event delivers paragraphs
- **THEN** the paragraph refine node SHALL display the refined paragraph count with expandable details

### Requirement: Idle state
The flow graph SHALL have a meaningful idle state when no question has been asked yet.

#### Scenario: No question asked
- **WHEN** the retrieval path tab is viewed before any question is submitted
- **THEN** the flow graph SHALL display all nodes in inactive state with a hint message "Ask a question to see the retrieval path"
