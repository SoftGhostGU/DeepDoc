## MODIFIED Requirements

### Requirement: Progressive node activation
Nodes in the flow graph SHALL activate progressively as SSE stage events arrive, creating an animation effect of the retrieval "flowing" through the pipeline. The visual state of each node and edge MUST update in real time as `currentStage` and `isStreaming` change; node/edge state SHALL NOT be frozen to its initial value once the component mounts. Edges leading into an active or completed node SHALL be animated; edges leading into an inactive node SHALL NOT be animated.

#### Scenario: Node lights up on stage event
- **WHEN** an SSE stage event for `retrieving_summary` arrives
- **THEN** the corresponding node SHALL transition from inactive (gray) to active (highlighted color with animation), and the edge leading to it SHALL animate

#### Scenario: State transitions propagate during streaming
- **WHEN** `currentStage` changes from one stage to the next during a streaming response (e.g., `analyzing` → `rewriting`)
- **THEN** the previous node SHALL transition to completed within one render cycle, and the new node SHALL transition to active; no node SHALL remain stuck in its prior state

#### Scenario: All nodes lit after completion
- **WHEN** streaming has ended successfully and the final answer has been rendered
- **THEN** every node in the flow (from `query` through `answer`) SHALL be in the completed state, forming a fully illuminated path

### Requirement: Retrieval flow graph
The system SHALL render a directed flow graph using React Flow that visualizes the retrieval pipeline: `Query → Analyze → Rewrite → Summary Recall → Paragraph Refine → Generate → Answer`. Each step SHALL be a node in the flow. The node positions SHALL adapt to the container's available width so that the flow is readable at common viewport sizes (desktop and narrow viewports down to ~375px).

#### Scenario: Flow graph layout
- **WHEN** the user opens the "检索路径" tab
- **THEN** a left-to-right directed graph SHALL be rendered with nodes for each retrieval stage connected by edges

#### Scenario: Responsive spacing on narrow viewports
- **WHEN** the tab container is rendered at a narrow width (e.g., < 640px)
- **THEN** the graph SHALL either distribute node spacing based on available width or allow panning so that every node remains reachable by the user

## ADDED Requirements

### Requirement: Query and Answer node lifecycle
The `query` and `answer` nodes SHALL have a well-defined lifecycle that does not regress visually once a stage has been reached.

#### Scenario: Query completed when streaming starts
- **WHEN** the user submits a question and streaming begins (`isStreaming === true` or `currentStage !== null`)
- **THEN** the `query` node SHALL be displayed as completed

#### Scenario: Query remains completed after streaming ends
- **WHEN** streaming has ended for a question (`isStreaming === false` and `currentStage === null`) and an assistant answer was produced
- **THEN** the `query` node SHALL remain in the completed state (SHALL NOT revert to inactive)

#### Scenario: Answer active during generation
- **WHEN** `currentStage === "generating"`
- **THEN** the `answer` node SHALL be displayed as active (or at minimum not inactive)

#### Scenario: Answer completed after streaming ends
- **WHEN** streaming ends successfully with an assistant message produced
- **THEN** the `answer` node SHALL be displayed as completed

### Requirement: Final stage completion
The final pipeline stage (`generating`) SHALL be able to reach the completed state once streaming ends successfully. It MUST NOT be permanently stuck in `active` or `inactive` because of ordering logic that relies on strictly later stages.

#### Scenario: Generating stage completes on stream end
- **WHEN** streaming ends successfully after the `generating` stage
- **THEN** the `generating` node SHALL transition to completed

### Requirement: Interaction on small screens
The flow graph SHALL allow the user to pan the canvas when the graph does not fit in the visible area, so that overflow nodes are reachable on narrow viewports.

#### Scenario: Pan on narrow viewport
- **WHEN** the flow tab is rendered in a container narrower than the total node width
- **THEN** the user SHALL be able to pan the graph horizontally (drag) to reveal nodes that would otherwise be clipped
