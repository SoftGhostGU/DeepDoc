## ADDED Requirements

### Requirement: Dependencies installation
The system SHALL have all required production and development dependencies installed in `package.json`, including: shadcn/ui (and its Radix UI primitives), Zustand, React Flow (@xyflow/react), ECharts (echarts + echarts-for-react), Prisma (@prisma/client + prisma dev), and any required utility libraries (e.g., clsx, tailwind-merge, class-variance-authority, lucide-react).

#### Scenario: All dependencies resolvable
- **WHEN** running `npm install` in the `web-app/` directory
- **THEN** all dependencies SHALL install without errors

#### Scenario: Dev server starts
- **WHEN** running `npm run dev` in the `web-app/` directory
- **THEN** the Next.js dev server SHALL start on port 3000 without errors

### Requirement: Docker Compose orchestration
The project root SHALL contain a `docker-compose.yml` that defines three services: `web` (Next.js, port 3000), `rag` (Python FastAPI, port 8000), and `qdrant` (vector database, port 6333). Each service SHALL have a corresponding Dockerfile or image reference.

#### Scenario: Full stack startup
- **WHEN** running `docker-compose up` from the project root
- **THEN** all three services SHALL start and be accessible on their respective ports

#### Scenario: Web-only development
- **WHEN** running `docker-compose up web` from the project root
- **THEN** only the Next.js service SHALL start, operating in Mock mode without requiring the RAG service

### Requirement: Environment configuration
The system SHALL use a `.env.local` file (gitignored) for local configuration. The following environment variables SHALL be supported: `RAG_SERVICE_URL` (Python RAG service base URL, empty = mock mode), `DATABASE_URL` (SQLite connection string).

#### Scenario: Mock mode by default
- **WHEN** `RAG_SERVICE_URL` is not set or empty
- **THEN** the application SHALL operate in Mock mode, returning simulated data from Route Handlers

#### Scenario: Real mode with RAG service
- **WHEN** `RAG_SERVICE_URL` is set to a valid URL (e.g., `http://localhost:8000`)
- **THEN** Route Handlers SHALL proxy requests to the Python RAG service

### Requirement: Project directory structure
The `web-app/` directory SHALL follow the structure outlined in the product document, with clear separation: `app/` for pages and API routes, `components/` for UI components, `lib/` for utilities and API client, `types/` for TypeScript type definitions, `prisma/` for database schema.

#### Scenario: Structure matches convention
- **WHEN** inspecting the `web-app/` directory
- **THEN** the following directories SHALL exist: `app/(pages)/`, `app/api/`, `components/`, `lib/`, `types/`, `prisma/`, `public/`
