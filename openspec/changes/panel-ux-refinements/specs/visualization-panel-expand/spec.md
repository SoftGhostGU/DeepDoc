## ADDED Requirements

### Requirement: Expand button on right-side tab panel
The right-side tab panel (containing citations, thought, mindmap, retrieval path, heatmap, and performance tabs) SHALL provide a single "expand" icon button anchored in the tab header row. The button SHALL apply to whichever tab is currently active. Clicking the button SHALL open a modal dialog that re-renders the active tab's content at a larger size.

#### Scenario: Expand button is always visible alongside tabs
- **WHEN** the chat workspace renders
- **THEN** an expand icon button SHALL be visible in the tab header, positioned to the right of the tab triggers and present regardless of which tab is active

#### Scenario: Switching active tab updates the expand target
- **WHEN** the user switches from one tab to another while the dialog is closed
- **THEN** a subsequent click on the expand button SHALL open a dialog whose content corresponds to the newly active tab, not the previously active one

### Requirement: Expanded modal dialog
The modal opened from the expand button SHALL render the active tab's content inside a dialog sized to `max-w-5xl` width and `h-[85vh]` height (or equivalent large-canvas dimensions). The dialog SHALL be dismissible via the Escape key, the dialog's close button, and clicking the backdrop. Dialog content SHALL scroll internally; it SHALL NOT cause the underlying page to scroll.

#### Scenario: Dialog opens at large size
- **WHEN** the user clicks the expand button
- **THEN** a dialog SHALL open displaying the active tab's content at a size substantially larger than the 340px side panel (at least 80% of viewport width on common desktop sizes)

#### Scenario: Dialog dismissal
- **WHEN** the dialog is open and the user presses Escape, clicks the close button, or clicks the backdrop
- **THEN** the dialog SHALL close and focus SHALL return to the expand button

#### Scenario: Dialog content overflow scrolls internally
- **WHEN** the content rendered inside the dialog exceeds the dialog's inner height
- **THEN** the overflow SHALL produce a scrollbar inside the dialog body, and the background page SHALL remain non-scrolling

### Requirement: Expanded rendering reuses canonical tab components
The dialog SHALL reuse the same React components that render each tab in the side panel (citation panel, mindmap, retrieval flow, heatmap, thought stream, performance dashboard) rather than introducing forked views. Visualization libraries (ECharts, React Flow) SHALL recompute their layout to match the larger container.

#### Scenario: Heatmap re-renders at expanded size
- **WHEN** the user opens the dialog while the heatmap tab is active
- **THEN** the same `DocumentHeatmap` component SHALL render inside the dialog, and the underlying ECharts instance SHALL resize to fill the larger canvas (not remain at the 340px-wide layout)

#### Scenario: Retrieval flow re-renders at expanded size
- **WHEN** the user opens the dialog while the retrieval path tab is active
- **THEN** the same `RetrievalFlow` component SHALL render inside the dialog, and React Flow SHALL call `fitView` so nodes fill the larger canvas
