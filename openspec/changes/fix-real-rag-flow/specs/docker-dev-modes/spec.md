## MODIFIED Requirements

### Requirement: Docker Compose must support full-stack development
The project Docker Compose configuration SHALL also support starting the full local stack for integration work, including web, rag, and qdrant services. Full-stack mode SHALL provide a supported way to configure embedding model access for restricted-network environments.

#### Scenario: Full-stack startup
- **WHEN** running the documented full-stack compose command from the project root
- **THEN** the web, rag, and qdrant services SHALL all start with the web service configured to use the real RAG endpoint

#### Scenario: Full-stack mode preserves service dependencies
- **WHEN** the full-stack compose command is used
- **THEN** the web service SHALL wait on the services it needs for integration mode instead of forcing those dependencies in mock-only mode

#### Scenario: Full-stack embedding mirror configuration
- **WHEN** the developer supplies `HF_ENDPOINT` or `HF_MIRROR` for Docker full-stack mode
- **THEN** the rag service SHALL receive that configuration and use it for embedding model downloads

#### Scenario: Restricted-network setup is documented
- **WHEN** a developer follows the documented full-stack setup for an environment without direct Hugging Face access
- **THEN** the documentation SHALL describe the required embedding mirror configuration needed to make real rag retrieval operational
