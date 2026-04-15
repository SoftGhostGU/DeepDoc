# DeepDoc

## Local Development

### Web only (Mock mode)

```bash
docker compose up web
```

This starts only the Next.js app, with `RAG_SERVICE_URL` left empty so the app stays in mock mode.

### Full stack (web + rag + qdrant)

```bash
RAG_SERVICE_URL=http://rag:8000 docker compose --profile full up web rag qdrant
```

This starts the frontend together with the local RAG service and Qdrant for integration testing.
