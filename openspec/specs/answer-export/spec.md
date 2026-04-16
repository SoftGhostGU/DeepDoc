## ADDED Requirements

### Requirement: Copy single answer as Markdown
The system SHALL provide a "copy" button on each assistant message that copies the answer content (with citation footnotes) as Markdown to the clipboard.

#### Scenario: Copy single answer
- **WHEN** the user clicks the copy button on an assistant message
- **THEN** the message content SHALL be copied to the clipboard as Markdown, with inline citation markers `[1]` preserved and a footnote section appended listing each citation's source text and path

#### Scenario: Copy success feedback
- **WHEN** the copy operation succeeds
- **THEN** the button SHALL briefly change to a checkmark icon and show "已复制" tooltip

#### Scenario: Copy fallback
- **WHEN** the Clipboard API is unavailable
- **THEN** the system SHALL fall back to `document.execCommand('copy')` or display the Markdown in a selectable text dialog

### Requirement: Export full conversation
The system SHALL provide an "export conversation" button that downloads the entire chat session as a Markdown file.

#### Scenario: Export button location
- **WHEN** the user is in a chat session with at least one message
- **THEN** an "导出对话" button SHALL be visible in the session header or toolbar area

#### Scenario: Export file format
- **WHEN** the user clicks "导出对话"
- **THEN** a `.md` file SHALL be downloaded containing: document name as H1, session title as H2, each message formatted as a section (user messages as blockquotes, assistant messages as body text), and a collected "引用来源" section at the bottom listing all citations

#### Scenario: Export filename
- **WHEN** the file is exported
- **THEN** the filename SHALL follow the pattern `DeepDoc-{documentName}-{sessionTitle}-{date}.md`

### Requirement: Markdown citation formatting
Exported Markdown SHALL format citations as footnotes.

#### Scenario: Citation footnotes
- **WHEN** an assistant message contains citations `[1]` and `[2]`
- **THEN** the exported Markdown SHALL include `[^1]` and `[^2]` inline and a footnote section: `[^1]: {citation text} (来源: {path})`
