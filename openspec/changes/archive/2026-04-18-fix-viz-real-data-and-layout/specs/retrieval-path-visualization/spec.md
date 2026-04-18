## MODIFIED Requirements

### Requirement: Progressive node activation
Nodes in the flow graph SHALL activate progressively as SSE stage events arrive, creating an animation effect of the retrieval "flowing" through the pipeline. The visual state of each node and edge MUST update in real time as `currentStage` and `isStreaming` change; node/edge state SHALL NOT be frozen to its initial value once the component mounts. Edges leading into an active or completed node SHALL be animated; edges leading into an inactive node SHALL NOT be animated. Once streaming has finished successfully (`hasFinished === true`), ALL pipeline stages (including intermediate stages such as `analyzing`, `rewriting`, `retrieving_summary`, `retrieving_paragraphs`) SHALL be displayed as completed; no stage SHALL regress to `inactive` after it has been reached.

#### Scenario: Node lights up on stage event
- **WHEN** an SSE stage event for `retrieving_summary` arrives
- **THEN** the corresponding node SHALL transition from inactive (gray) to active (highlighted color with animation), and the edge leading to it SHALL animate

#### Scenario: State transitions propagate during streaming
- **WHEN** `currentStage` changes from one stage to the next during a streaming response (e.g., `analyzing` → `rewriting`)
- **THEN** the previous node SHALL transition to completed within one render cycle, and the new node SHALL transition to active; no node SHALL remain stuck in its prior state

#### Scenario: All intermediate nodes lit after completion
- **WHEN** streaming has ended successfully and the final answer has been rendered (`hasFinished === true`)
- **THEN** every node in the flow (including `analyzing`, `rewriting`, `retrieving_summary`, `retrieving_paragraphs`, `generating`) SHALL be in the completed state; no intermediate stage SHALL appear inactive

## ADDED Requirements

### Requirement: Paragraph retrieval payload carries score and real index
The SSE `retrieval_paragraphs` event payload SHALL include, for each paragraph entry, a numeric `score` field reflecting the retriever's relevance score (0.0 to 1.0) and a real `index` field identifying the paragraph within the document (not a hard-coded constant). Consumers MAY fall back to 0 when these fields are absent (to keep backward compatibility with older payloads) but the server SHALL emit them for all new responses.

#### Scenario: Paragraphs include score field
- **WHEN** the server emits an SSE `retrieval_paragraphs` event
- **THEN** each paragraph in `paragraphs[]` SHALL include a numeric `score` field (the retriever's relevance score)

#### Scenario: Paragraphs include real index
- **WHEN** the server emits an SSE `retrieval_paragraphs` event for a document with parsed paragraphs
- **THEN** each paragraph in `paragraphs[]` SHALL include a numeric `index` field that reflects its position in the source document (or its position within the retrieval result set if the document-level index is not available), and SHALL NOT be a hard-coded `0` for every entry
