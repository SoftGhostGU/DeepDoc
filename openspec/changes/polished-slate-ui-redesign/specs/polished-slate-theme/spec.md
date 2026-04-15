## ADDED Requirements

### Requirement: CSS variable color system
The system SHALL define all theme colors as CSS custom properties on `:root`, using the Zinc + Indigo palette.

#### Scenario: Base color variables defined
- **WHEN** the application loads
- **THEN** the following CSS variables SHALL be available: `--background` (#09090B), `--surface` (#111113), `--surface-raised` (#18181B), `--surface-hover` (#27272A), `--border` (#3F3F46), `--border-subtle` (#27272A), `--foreground` (#FAFAFA), `--foreground-muted` (#A1A1AA), `--foreground-dim` (#71717A)

#### Scenario: Accent color variables defined
- **WHEN** the application loads
- **THEN** the following accent CSS variables SHALL be available: `--accent` (#6366F1), `--accent-hover` (#818CF8), `--accent-muted` (#4F46E5), `--accent-subtle` (rgba(99,102,241,0.1))

#### Scenario: Status color variables defined
- **WHEN** the application loads
- **THEN** the following status CSS variables SHALL be available: `--success` (#22C55E), `--warning` (#EAB308), `--destructive` (#EF4444)

### Requirement: Three-level surface hierarchy
The system SHALL use a three-level surface system to create visual depth without relying on shadows.

#### Scenario: Surface level mapping
- **WHEN** rendering the application layout
- **THEN** Level 0 (`--background`) SHALL be used for page backgrounds, Level 1 (`--surface`) SHALL be used for sidebars and panels, Level 2 (`--surface-raised`) SHALL be used for cards, inputs, and dialogs

#### Scenario: Border reinforcement
- **WHEN** a surface-raised element appears on a surface or background
- **THEN** a 1px border using `--border-subtle` SHALL be applied to reinforce the visual boundary

### Requirement: shadcn/ui variable mapping
The system SHALL map Polished Slate tokens to shadcn/ui's expected CSS variable names.

#### Scenario: Primary mapping
- **WHEN** shadcn/ui components reference `--primary`
- **THEN** the value SHALL resolve to the `--accent` color (#6366F1)

#### Scenario: Muted mapping
- **WHEN** shadcn/ui components reference `--muted`
- **THEN** the value SHALL resolve to the `--surface-raised` color (#18181B)

### Requirement: Animation color update
All keyframe animations in globals.css SHALL use the new Polished Slate color tokens instead of the deep-sea colors.

#### Scenario: Shimmer animation
- **WHEN** the shimmer animation plays
- **THEN** the gradient colors SHALL use `--accent` and `--accent-hover` instead of `#00d4ff`

#### Scenario: Pulse glow animation
- **WHEN** the pulse-glow animation plays
- **THEN** the glow color SHALL use `--accent` (indigo) instead of cyan

### Requirement: No hardcoded deep-sea colors
After migration, NO component file SHALL contain hardcoded references to the old deep-sea palette colors (`#0a1628`, `#00d4ff`, `#0ea5e9`, `#f0f9ff`).

#### Scenario: Color audit passes
- **WHEN** a grep search is run for old palette hex values across web-app/
- **THEN** zero matches SHALL be found in `.tsx` and `.css` files (excluding comments and documentation)
