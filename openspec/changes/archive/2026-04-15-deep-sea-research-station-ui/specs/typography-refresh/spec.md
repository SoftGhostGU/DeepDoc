## ADDED Requirements

### Requirement: Font Stack Configuration
The system SHALL use a dual-font stack with distinct roles for technical/code content and UI text.

#### Scenario: Font families loaded
- **WHEN** the application initializes
- **THEN** JetBrains Mono SHALL be loaded for monospace/code contexts
- **AND** Space Grotesk SHALL be loaded for UI text and headings

#### Scenario: CSS variable definitions
- **WHEN** styles are computed
- **THEN** `--font-mono` SHALL reference JetBrains Mono
- **AND** `--font-sans` SHALL reference Space Grotesk
- **AND** `--font-heading` SHALL reference Space Grotesk with appropriate weights

### Requirement: Type Scale
The system SHALL implement a refined type scale optimized for readability in dark mode.

#### Scenario: Heading hierarchy
- **WHEN** headings are rendered
- **THEN** H1 SHALL be 2.25rem (36px) with font-weight 700
- **AND** H2 SHALL be 1.875rem (30px) with font-weight 600
- **AND** H3 SHALL be 1.5rem (24px) with font-weight 600
- **AND** H4 SHALL be 1.25rem (20px) with font-weight 600

#### Scenario: Body text sizes
- **WHEN** body text is rendered
- **THEN** base size SHALL be 16px (1rem) with line-height 1.6
- **AND** small text SHALL be 0.875rem (14px) with line-height 1.5
- **AND** extra small SHALL be 0.75rem (12px)

#### Scenario: Code and technical text
- **WHEN** code, file names, or technical identifiers appear
- **THEN** they SHALL use JetBrains Mono at 0.9em relative size
- **AND** they SHALL have subtle background (`rgba(0, 212, 255, 0.08)`)
- **AND** they SHALL have rounded padding (2px 6px)

### Requirement: Chinese Typography Support
The system SHALL ensure Chinese text renders beautifully with the new font stack.

#### Scenario: Chinese fallback
- **WHEN** Chinese characters are displayed
- **THEN** they SHALL fall back to system Chinese fonts (PingFang SC, Microsoft YaHei)
- **AND** they SHALL maintain appropriate line-height (1.8 for Chinese)

#### Scenario: Mixed content
- **WHEN** Chinese and English text appear together
- **THEN** the fonts SHALL harmonize visually
- **AND** spacing SHALL feel natural for both scripts

### Requirement: Font Loading Strategy
The system SHALL implement optimal font loading to prevent layout shift.

#### Scenario: Font display
- **WHEN** fonts are loading
- **THEN** `font-display: swap` SHALL be used
- **AND** system fonts SHALL serve as immediate fallback

#### Scenario: Preload critical fonts
- **WHEN** the page loads
- **THEN** Space Grotesk regular and 600 weight SHALL be preloaded
