## 1. Chat Session Integrity

- [x] 1.1 Update `web-app/app/api/chat/route.ts` so existing `session_id` values are validated against the requested `doc_id`
- [x] 1.2 Reject cross-document session reuse with a clear 4xx response and ensure no messages are persisted on that path
- [x] 1.3 Update the chat client flow to recover cleanly when the server reports an invalid or stale session

## 2. Upload Failure Recovery

- [x] 2.1 Refactor `web-app/app/api/upload/route.ts` to track when a `Document` has been created and centralize failure-state cleanup
- [x] 2.2 Ensure all real-mode downstream failures move the document to `FAILED` before returning an error
- [x] 2.3 Verify successful real-mode parsing still transitions documents to `INDEXED`

## 3. Citation Panel Selection

- [x] 3.1 Change the chat page state model so citation selection is tied to a specific assistant message instead of the latest answer globally
- [x] 3.2 Update `ChatWindow` and related citation components to derive panel content from the selected message's citations
- [x] 3.3 Preserve a sensible default state so the latest assistant answer remains selected until the user picks an older one

## 4. Docker Development Modes

- [x] 4.1 Update `docker-compose.yml` so `docker compose up web` runs the web app in mock mode without requiring rag or qdrant
- [x] 4.2 Add a documented full-stack compose path that starts web, rag, and qdrant with the real `RAG_SERVICE_URL`
- [x] 4.3 Verify the compose configuration still resolves correctly for both mock-only and full-stack modes

## 5. Verification

- [x] 5.1 Re-run `pnpm lint` and `pnpm build` in `web-app/`
- [x] 5.2 Re-run the mock upload -> chat flow and confirm citation interactions still work after the selection changes
- [ ] 5.3 Run the relevant Docker Compose command(s) and confirm the intended startup behavior now matches the new spec
