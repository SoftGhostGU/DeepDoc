## ADDED Requirements

### Requirement: Prisma schema with core models
The system SHALL define a Prisma schema (`prisma/schema.prisma`) using SQLite as the datasource. The schema SHALL include three models: `Document`, `ChatSession`, and `ChatMessage`.

#### Scenario: Document model fields
- **WHEN** inspecting the `Document` model
- **THEN** it SHALL contain fields: `id` (string, primary key), `filename` (string), `originalName` (string), `size` (int, bytes), `mimeType` (string), `status` (enum: UPLOADING, PARSING, INDEXED, FAILED), `structureTree` (optional JSON), `pageCount` (optional int), `createdAt` (datetime), `updatedAt` (datetime)

#### Scenario: ChatSession model fields
- **WHEN** inspecting the `ChatSession` model
- **THEN** it SHALL contain fields: `id` (string, primary key), `documentId` (string, foreign key to Document), `title` (string), `createdAt` (datetime), `updatedAt` (datetime)

#### Scenario: ChatMessage model fields
- **WHEN** inspecting the `ChatMessage` model
- **THEN** it SHALL contain fields: `id` (string, primary key), `sessionId` (string, foreign key to ChatSession), `role` (enum: USER, ASSISTANT), `content` (string), `citations` (optional JSON), `retrievalPath` (optional JSON), `metadata` (optional JSON), `createdAt` (datetime)

### Requirement: Database migrations
The system SHALL support Prisma migrations for schema changes.

#### Scenario: Initial migration
- **WHEN** running `npx prisma migrate dev` for the first time
- **THEN** a SQLite database file SHALL be created and all tables SHALL be initialized

### Requirement: Prisma client singleton
The system SHALL export a singleton Prisma client instance from `lib/prisma.ts` to avoid multiple client instances in development (hot reload).

#### Scenario: Singleton in development
- **WHEN** importing the Prisma client from multiple modules during development
- **THEN** all modules SHALL share the same client instance
