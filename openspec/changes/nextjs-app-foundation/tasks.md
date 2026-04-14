## 1. Project Scaffold & Dependencies

- [x] 1.1 Install production dependencies: shadcn/ui (with Radix UI primitives, clsx, tailwind-merge, class-variance-authority, lucide-react), zustand, @xyflow/react, echarts, echarts-for-react, @prisma/client, eventsource-parser
- [x] 1.2 Install dev dependencies: prisma, openapi-typescript
- [x] 1.3 Initialize shadcn/ui configuration (components.json, cn utility, base components: Button, Input, Card, Dialog, ScrollArea, Tabs, Badge, Tooltip)
- [x] 1.4 Create project directory structure: `app/(pages)/`, `app/api/upload/`, `app/api/documents/`, `app/api/chat/`, `app/api/compare/`, `app/api/history/`, `components/ui/`, `components/rag/`, `lib/`, `types/`, `prisma/`, `public/uploads/`
- [x] 1.5 Create `.env.local` with `RAG_SERVICE_URL` (empty for mock) and `DATABASE_URL` (SQLite path)
- [x] 1.6 Create `docker-compose.yml` in project root (web + rag + qdrant services, with volume mounts and environment variables)
- [x] 1.7 Create `web-app/Dockerfile` for Next.js service
- [x] 1.8 Update `next.config.ts` for body size limit and any required experimental features

## 2. TypeScript Types & Contracts

- [x] 2.1 Define RAG service request/response types in `types/rag.ts` (ParseResponse, IndexResponse, DocumentTree, ParagraphList, RetrieveRequest/Response, AskRequest, CompareRequest, SSE event types for each stage)
- [x] 2.2 Define frontend data types in `types/index.ts` (Document, ChatSession, ChatMessage, Citation, RetrievalPath)
- [x] 2.3 Create Zustand store in `lib/stores/` (document-store: current doc, doc list; chat-store: sessions, messages, streaming state, current stage)

## 3. Database Layer (Prisma + SQLite)

- [x] 3.1 Create `prisma/schema.prisma` with Document, ChatSession, ChatMessage models (as specified in database-layer spec)
- [x] 3.2 Run initial Prisma migration to generate SQLite database
- [x] 3.3 Create Prisma client singleton at `lib/prisma.ts`

## 4. Route Handlers & SSE Proxy

- [x] 4.1 Create `/api/upload/route.ts` — accept multipart file, save to local storage, create Document record in DB, forward to Python service (or return mock)
- [x] 4.2 Create `/api/documents/route.ts` — GET: query all documents from DB, return as JSON array
- [x] 4.3 Create `/api/chat/route.ts` — POST: proxy to Python `/api/ask` via SSE passthrough (ReadableStream), or return mock SSE stream; persist messages to DB
- [x] 4.4 Create `/api/compare/route.ts` — POST: proxy to Python `/api/compare` SSE, or return mock dual-track SSE
- [x] 4.5 Create `/api/history/route.ts` — GET: return chat sessions and messages for a document
- [x] 4.6 Create shared RAG client utility at `lib/rag-client.ts` (wraps fetch to Python service, handles SSE forwarding logic, mock/real switch)

## 5. Mock Server Implementation

- [x] 5.1 Create mock data fixtures in `lib/mock/` (sample document tree, paragraphs, retrieval results, citations)
- [x] 5.2 Implement mock SSE stream generator in `lib/mock/sse.ts` (simulates analyzing → rewriting → retrieving_summary → retrieving_paragraphs → generating stages with realistic delays and token-by-token text)
- [x] 5.3 Implement mock compare stream (dual-track naive + hierarchical with timing differences)
- [x] 5.4 Wire mock responses into each Route Handler (activated when `RAG_SERVICE_URL` is empty)

## 6. Document Management Page

- [x] 6.1 Create app layout with navigation sidebar (document list, new upload button)
- [x] 6.2 Create document upload component (`components/rag/document-upload.tsx`) — drag-and-drop + file picker, file type validation (PDF/MD/TXT), size validation, upload progress indicator
- [x] 6.3 Create document list component (`components/rag/document-list.tsx`) — card/list view with filename, size, date, status badge (uploading/parsing/indexed/failed)
- [x] 6.4 Create empty state component for when no documents exist
- [x] 6.5 Create document management page at `app/(pages)/documents/page.tsx` composing the above components
- [x] 6.6 Implement document deletion (confirm dialog + DELETE API + UI update)

## 7. Chat Interface

- [x] 7.1 Create chat message component (`components/rag/chat-message.tsx`) — renders user/assistant messages, Markdown formatting for assistant, citation badges inline
- [x] 7.2 Create chat input component (`components/rag/chat-input.tsx`) — textarea with Enter to submit, Shift+Enter for newline, send button, disabled state while streaming
- [x] 7.3 Create streaming stage indicator component (`components/rag/stage-indicator.tsx`) — displays current RAG processing stage with animation
- [x] 7.4 Create chat window component (`components/rag/chat-window.tsx`) — composes message list + input + stage indicator, handles SSE consumption, auto-scroll
- [x] 7.5 Create chat session sidebar (`components/rag/session-sidebar.tsx`) — list sessions for current document, new session button, switch sessions
- [x] 7.6 Create chat page at `app/(pages)/chat/[documentId]/page.tsx` composing all chat components
- [x] 7.7 Implement SSE consumption logic in chat store (EventSource or fetch + ReadableStream reader, parse SSE events, update streaming state)

## 8. Citation Tracing

- [x] 8.1 Create citation marker component (`components/rag/citation-marker.tsx`) — clickable numbered badge rendered inline in answer text
- [x] 8.2 Create citation detail panel component (`components/rag/citation-panel.tsx`) — sidebar showing cited paragraph text, document hierarchy path, relevance score
- [x] 8.3 Implement citation click handler (open panel, highlight selected citation, scroll to it)
- [x] 8.4 Create "View in context" feature — display surrounding document section with highlighted citation
- [x] 8.5 Create citation summary footer component — "Based on N sources" with expandable source list, rendered below each assistant message

## 9. Integration & Polish

- [x] 9.1 Wire up navigation flow: home → documents page → click document → chat page
- [x] 9.2 Update root `page.tsx` to redirect or serve as landing/documents page
- [x] 9.3 Update `layout.tsx` with proper metadata (title: "DeepDoc", description) and global layout structure
- [x] 9.4 Verify full flow end-to-end in Mock mode: upload → document appears → open chat → ask question → see streaming answer with citations
- [ ] 9.5 Verify Docker Compose brings up all services correctly
