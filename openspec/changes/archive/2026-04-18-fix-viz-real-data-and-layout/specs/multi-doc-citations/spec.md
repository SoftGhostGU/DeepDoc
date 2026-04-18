## ADDED Requirements

### Requirement: Citation panel fills available height
The citation panel SHALL make its scrollable citation list fill the full available height of its tab container. It MUST NOT use a fixed pixel height (such as `h-[420px]`) that leaves unused empty space below the list when the tab container is taller than the fixed size. When an optional context-view section is shown alongside the citation list in the citations tab, the list SHALL shrink to accommodate the context section via flex layout rather than overflowing or leaving whitespace.

#### Scenario: Panel fills tab container height
- **WHEN** the citation panel is rendered inside the citations tab
- **THEN** the scrollable list SHALL fill the full height of the tab container; no empty background SHALL be visible below the list

#### Scenario: Context view shares space with list
- **WHEN** a context-view section is rendered alongside the citation list
- **THEN** the list SHALL shrink using flex-based layout so both are visible without overflow or blank gaps

#### Scenario: Short list does not create artificial whitespace
- **WHEN** the citation list has only a few items (less than would fill the visible area)
- **THEN** the list's scroll container SHALL still occupy the full tab height; only the remaining space within the scroll area may be empty (as normal), and no additional whitespace SHALL exist between the scroll area and the bottom of the tab
