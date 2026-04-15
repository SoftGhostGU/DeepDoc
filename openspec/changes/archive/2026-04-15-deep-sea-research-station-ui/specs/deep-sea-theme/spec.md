## ADDED Requirements

### Requirement: Deep Sea Color Palette
The system SHALL implement a deep-sea themed color palette with specific hex values for all semantic color roles.

#### Scenario: Background colors
- **WHEN** the theme is applied
- **THEN** the main background SHALL be `#0a1628` (deep ocean)
- **AND** card/panel backgrounds SHALL be `#0f1d32` (slightly lighter)
- **AND** elevated surfaces SHALL be `#142238`

#### Scenario: Accent colors
- **WHEN** interactive elements are displayed
- **THEN** primary accent SHALL be `#00d4ff` (bioluminescent cyan)
- **AND** success states SHALL use `#10b981` (emerald)
- **AND** warning states SHALL use `#f59e0b` (amber)
- **AND** error states SHALL use `#f43f5e` (rose)

#### Scenario: Text colors
- **WHEN** text is rendered
- **THEN** primary text SHALL be `#f0f9ff` (ice white)
- **AND** secondary text SHALL be `#94a3b8` (slate)
- **AND** muted text SHALL be `#64748b`

### Requirement: Glow Effects
The system SHALL implement subtle glow effects on interactive elements using box-shadow and CSS filters.

#### Scenario: Button glow on hover
- **WHEN** user hovers over a primary button
- **THEN** the button SHALL have a cyan glow effect (`box-shadow: 0 0 20px rgba(0, 212, 255, 0.3)`)
- **AND** the glow SHALL animate smoothly (200ms ease-out)

#### Scenario: Focus ring glow
- **WHEN** an input or button receives focus
- **THEN** it SHALL display a cyan glow ring (`box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.5)`)

#### Scenario: Card hover state
- **WHEN** user hovers over a document card
- **THEN** the card border SHALL transition to cyan (`border-color: rgba(0, 212, 255, 0.5)`)
- **AND** a subtle inner glow SHALL appear

### Requirement: Atmospheric Background
The system SHALL include atmospheric background effects creating depth and immersion.

#### Scenario: Gradient overlay
- **WHEN** the page loads
- **THEN** a subtle radial gradient SHALL be visible (`radial-gradient(ellipse at top, rgba(0, 212, 255, 0.05), transparent 50%)`)

#### Scenario: Scanline texture (optional)
- **WHEN** the user enables enhanced visuals (future setting)
- **THEN** a subtle scanline pattern overlay SHALL appear at 5% opacity

### Requirement: Border Styling
The system SHALL use consistent border styling that reinforces the underwater/technical aesthetic.

#### Scenario: Panel borders
- **WHEN** cards and panels are rendered
- **THEN** they SHALL have 1px borders (`border: 1px solid rgba(148, 163, 184, 0.1)`)
- **AND** elevated panels SHALL have slightly more visible borders

#### Scenario: Divider lines
- **WHEN** sections are separated
- **THEN** dividers SHALL use subtle gradient lines (`linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent)`)

### Requirement: Status Indicators
The system SHALL style status badges and indicators to match the deep-sea theme.

#### Scenario: Document status badges
- **WHEN** document status is displayed
- **THEN** INDEXED status SHALL use emerald with subtle glow
- **AND** PARSING status SHALL use amber with pulsing animation
- **AND** UPLOADING status SHALL use cyan with progress shimmer
- **AND** FAILED status SHALL use rose with error styling

#### Scenario: Processing indicators
- **WHEN** RAG processing is active
- **THEN** the stage indicator SHALL have a flowing/cascading animation effect
- **AND** completed stages SHALL show a subtle check with cyan glow
