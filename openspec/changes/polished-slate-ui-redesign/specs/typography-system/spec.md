## ADDED Requirements

### Requirement: Geist font family
The application SHALL use Geist Sans for headings and body text, and Geist Mono for code, metadata, and technical labels.

#### Scenario: Font loading
- **WHEN** the application starts
- **THEN** Geist Sans and Geist Mono SHALL be loaded via `next/font` or the `geist` npm package, with CSS variables `--font-sans` and `--font-mono` defined

#### Scenario: Chinese fallback chain
- **WHEN** text contains Chinese characters not covered by Geist
- **THEN** the font SHALL fall back to: `PingFang SC`, `Microsoft YaHei`, `sans-serif` (for sans) or `Menlo`, `Consolas`, `monospace` (for mono)

### Requirement: Typography scale
The system SHALL follow a consistent typography scale across all pages.

#### Scenario: Heading sizes
- **WHEN** rendering page headings
- **THEN** H1 SHALL use 28px/700 weight, H2 SHALL use 20px/600 weight, H3 SHALL use 15px/600 weight

#### Scenario: Body text
- **WHEN** rendering body text (chat messages, descriptions)
- **THEN** the font size SHALL be 14px with line-height 1.6 for multi-line content

#### Scenario: Caption and metadata text
- **WHEN** rendering captions, timestamps, or metadata
- **THEN** the font SHALL be Geist Mono at 11-12px with `--foreground-dim` color

#### Scenario: Navigation labels
- **WHEN** rendering sidebar navigation labels
- **THEN** the font SHALL be Geist Sans at 14px with `--foreground-muted` color for inactive items
