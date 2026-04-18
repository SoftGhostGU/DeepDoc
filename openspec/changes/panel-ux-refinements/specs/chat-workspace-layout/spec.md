## ADDED Requirements

### Requirement: Viewport does not scroll
The chat workspace page SHALL occupy exactly the visible viewport height. The outer page (the `<main>` container of the authenticated shell and the chat page's root `<section>`) SHALL NOT produce a viewport-level scrollbar when the chat history or right-panel content grows tall. Instead, overflow SHALL be confined to designated inner regions.

#### Scenario: Tall chat history does not scroll the page
- **WHEN** the assistant has produced many messages such that the chat log height exceeds the visible area
- **THEN** the page (window) SHALL NOT scroll, and no scrollbar SHALL appear on the outer `<main>` or the chat page `<section>`

#### Scenario: Tall right-panel content does not scroll the page
- **WHEN** the active right-panel tab's content (e.g., a long citation list, deep mindmap, or large heatmap) exceeds the side-panel height
- **THEN** the page SHALL NOT scroll; any overflow SHALL be contained within the right panel

### Requirement: Independent scrolling in chat and right-panel regions
Within the chat workspace, the chat message area and each right-panel tab SHALL scroll independently. Scrolling inside one region SHALL NOT affect the scroll position of the other region, nor of the outer page.

#### Scenario: Chat scrolls without moving right panel
- **WHEN** the user scrolls inside the chat message area
- **THEN** the right panel's scroll position and the page scroll position SHALL remain unchanged

#### Scenario: Right panel scrolls without moving chat
- **WHEN** the user scrolls inside the active right-panel tab (e.g., citations list)
- **THEN** the chat message area's scroll position and the page scroll position SHALL remain unchanged

### Requirement: Tab content uses an internal flex layout
Each right-panel tab (citations, thought, mindmap, retrieval, heatmap, performance) SHALL render as a flex column with a non-shrinking header (when present), a `flex-1 min-h-0` body, and a scroll container at the innermost level so that tall content produces an internal scrollbar rather than pushing parents taller.

#### Scenario: Tab body fills the panel without overflowing
- **WHEN** a tab is active and its content fits within the panel height
- **THEN** the body SHALL fill the available height without introducing extra whitespace below

#### Scenario: Tab body scrolls when content exceeds panel height
- **WHEN** a tab's content is taller than the panel
- **THEN** the overflow SHALL produce a scrollbar inside the tab body (or a `ScrollArea` within it), and the parent panel SHALL NOT grow past its allotted height

### Requirement: Small-viewport fallback
On viewports whose height is too small to comfortably contain the chat input and at least one message (indicatively below 600px of available viewport height), the workspace MAY relax the viewport lock and allow the outer page to scroll, so that the chat input remains reachable. This fallback SHALL NOT apply at normal desktop/tablet heights.

#### Scenario: Very short viewport permits page scroll
- **WHEN** the viewport height is below the small-viewport threshold
- **THEN** the outer page MAY scroll to ensure the chat input remains visible and usable
