## ADDED Requirements

### Requirement: Docker Compose must support web-only mock development
The project Docker Compose configuration SHALL support starting only the web application in mock mode without requiring the RAG or Qdrant services.

#### Scenario: Web-only startup
- **WHEN** running `docker compose up web` from the project root
- **THEN** only the web service SHALL be required to start and the web service SHALL run with mock mode enabled

### Requirement: Docker Compose must support full-stack development
The project Docker Compose configuration SHALL also support starting the full local stack for integration work, including web, RAG, and Qdrant services.

#### Scenario: Full-stack startup
- **WHEN** running the documented full-stack compose command from the project root
- **THEN** the web, rag, and qdrant services SHALL all start with the web service configured to use the real RAG endpoint

#### Scenario: Full-stack mode preserves service dependencies
- **WHEN** the full-stack compose command is used
- **THEN** the web service SHALL wait on the services it needs for integration mode instead of forcing those dependencies in mock-only mode
