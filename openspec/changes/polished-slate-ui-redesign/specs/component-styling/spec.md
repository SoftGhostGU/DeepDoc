## ADDED Requirements

### Requirement: Button component styling
Button components SHALL follow the Polished Slate visual system.

#### Scenario: Primary button
- **WHEN** a primary/default button is rendered
- **THEN** it SHALL have a linear-gradient fill from `--accent` to `--accent-muted`, white text, and `rounded-lg` (8px) corners

#### Scenario: Secondary/outline button
- **WHEN** a secondary or outline button is rendered
- **THEN** it SHALL have a transparent background, 1px `--border` stroke, `--foreground-muted` text, and `rounded-md` (6px) corners

#### Scenario: Ghost button
- **WHEN** a ghost button is hovered
- **THEN** the background SHALL change to `--surface-hover`

### Requirement: Card component styling
Card components SHALL use the Level 2 surface with border reinforcement.

#### Scenario: Default card
- **WHEN** a card is rendered
- **THEN** it SHALL have `--surface-raised` background, 1px `--border-subtle` border, and `rounded-xl` (12px) corners

#### Scenario: Card hover state
- **WHEN** a card is hovered (where interactive)
- **THEN** the border color SHALL transition to `--border` (#3F3F46)

### Requirement: Input component styling
Input fields SHALL use the Level 2 surface style.

#### Scenario: Default input
- **WHEN** an input field is rendered
- **THEN** it SHALL have `--surface-raised` background, 1px `--border-subtle` border, `--foreground` text color, and `rounded-xl` (12px) corners

#### Scenario: Input focus state
- **WHEN** an input field receives focus
- **THEN** the border SHALL change to `--accent` with a subtle ring effect using `--accent-subtle`

### Requirement: Badge and status indicator styling
Badges SHALL use translucent accent or status colors as backgrounds.

#### Scenario: Active/accent badge
- **WHEN** a badge represents an active or accent state
- **THEN** it SHALL have `--accent-subtle` background (10% opacity indigo) and `--accent-hover` text

#### Scenario: Status badges
- **WHEN** a badge represents document status (indexed/parsing/failed)
- **THEN** "已索引" SHALL use green-tinted background (#22C55E1A) with green text, "解析中" SHALL use yellow-tinted (#EAB3081A) with yellow text, "失败" SHALL use red-tinted (#EF44441A) with red text

### Requirement: Dialog component styling
Dialog overlays SHALL use the Polished Slate dark style.

#### Scenario: Dialog background
- **WHEN** a dialog opens
- **THEN** the overlay SHALL be `rgba(0,0,0,0.6)` with backdrop-blur, and the dialog content SHALL use `--surface-raised` background with `--border-subtle` border

### Requirement: Tabs component styling
Tab components SHALL use a contained pill style.

#### Scenario: Tab container
- **WHEN** a tabs list is rendered
- **THEN** the container SHALL have `--surface-raised` background with 4px padding and `rounded-lg` corners

#### Scenario: Active tab
- **WHEN** a tab is active
- **THEN** it SHALL have `--accent-subtle` background and `--accent-hover` text color

### Requirement: Tooltip component styling
Tooltips SHALL use a compact dark style.

#### Scenario: Tooltip appearance
- **WHEN** a tooltip is shown
- **THEN** it SHALL have `--surface-hover` background, `--foreground` text at 12px, and `rounded-md` corners

### Requirement: ScrollArea component styling
ScrollArea thumb SHALL use a subtle style.

#### Scenario: Scrollbar thumb
- **WHEN** a scroll area is rendered
- **THEN** the scrollbar thumb SHALL use `--border` color with `rounded-full` corners, and the track SHALL be transparent
