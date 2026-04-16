import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createMockChatStream, createMockMultiDocChatStream } from "@/lib/mock/sse";
import {
  forwardJsonToRag,
  isMockMode,
  passthroughSseResponse,
  SSE_HEADERS,
} from "@/lib/rag-client";

export const runtime = "nodejs";

type ChatRequest = {
  doc_id?: string;
  doc_ids?: string[];
  query: string;
  session_id?: string;
  mode?: "hierarchical" | "naive";
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

function normalizeDocumentIds(payload: ChatRequest) {
  const fromArray = Array.isArray(payload.doc_ids)
    ? Array.from(
        new Set(
          payload.doc_ids
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      )
    : [];

  if (fromArray.length > 0) {
    return fromArray;
  }

  if (typeof payload.doc_id !== "string") {
    return [];
  }

  const single = payload.doc_id.trim();
  return single ? [single] : [];
}

function parseSessionDocumentIds(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function isSameDocumentSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

async function ensureSession(documentIds: string[], sessionId: string | undefined, query: string) {
  const primaryDocumentId = documentIds[0];
  if (!primaryDocumentId) {
    return null;
  }

  if (!sessionId) {
    return prisma.chatSession.create({
      data: {
        documentId: primaryDocumentId,
        documentIds:
          documentIds.length > 1
            ? (documentIds as unknown as Prisma.InputJsonValue)
            : undefined,
        title: query.slice(0, 64),
      },
    });
  }

  const existing = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (existing) {
    if (existing.documentId !== primaryDocumentId) {
      return null;
    }

    const existingDocumentIds = parseSessionDocumentIds(existing.documentIds as Prisma.JsonValue | null);
    if (documentIds.length > 1) {
      if (!isSameDocumentSet(existingDocumentIds, documentIds)) {
        return null;
      }
    } else if (existingDocumentIds.length > 1) {
      return null;
    }

    return existing;
  }

  return prisma.chatSession.create({
    data: {
      id: sessionId,
      documentId: primaryDocumentId,
      documentIds:
        documentIds.length > 1
          ? (documentIds as unknown as Prisma.InputJsonValue)
          : undefined,
      title: query.slice(0, 64),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const requestedDocumentIds = normalizeDocumentIds(body);
    const primaryDocumentId = requestedDocumentIds[0];
    const query = body.query?.trim();

    if (!primaryDocumentId || !query) {
      return NextResponse.json(
        { error: "doc_id or doc_ids and non-empty query are required" },
        { status: 400 },
      );
    }

    const documents = await prisma.document.findMany({
      where: { id: { in: requestedDocumentIds } },
      select: { id: true },
    });

    if (documents.length !== requestedDocumentIds.length) {
      return NextResponse.json({ error: "One or more documents were not found" }, { status: 404 });
    }

    const session = await ensureSession(requestedDocumentIds, body.session_id, query);

    if (!session) {
      return NextResponse.json(
        {
          error: "Session does not belong to the requested document scope",
          code: "INVALID_SESSION",
        },
        { status: 409 },
      );
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: query,
      },
    });

    if (isMockMode()) {
      const stream =
        requestedDocumentIds.length > 1
          ? createMockMultiDocChatStream({
              question: query,
              onFinal: async (final) => {
                await prisma.chatMessage.create({
                  data: {
                    sessionId: session.id,
                    role: "ASSISTANT",
                    content: final.answer,
                    citations: final.citations as unknown as Prisma.InputJsonValue,
                    retrievalPath: (final.retrieval_path ?? null) as unknown as Prisma.InputJsonValue,
                  },
                });

                await prisma.chatSession.update({
                  where: { id: session.id },
                  data: { updatedAt: new Date() },
                });
              },
            })
          : createMockChatStream({
              question: query,
              onFinal: async (final) => {
                await prisma.chatMessage.create({
                  data: {
                    sessionId: session.id,
                    role: "ASSISTANT",
                    content: final.answer,
                    citations: final.citations as unknown as Prisma.InputJsonValue,
                    retrievalPath: (final.retrieval_path ?? null) as unknown as Prisma.InputJsonValue,
                  },
                });

                await prisma.chatSession.update({
                  where: { id: session.id },
                  data: { updatedAt: new Date() },
                });
              },
            });

      return new Response(stream, { headers: SSE_HEADERS });
    }

    const upstream = await forwardJsonToRag("/api/ask", {
      ...(requestedDocumentIds.length > 1
        ? { doc_ids: requestedDocumentIds }
        : { doc_id: primaryDocumentId }),
      query,
      mode: body.mode ?? "hierarchical",
      history: body.history ?? [],
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return NextResponse.json(
        { error: "RAG service request failed", detail },
        { status: upstream.status },
      );
    }

    let accumulatedAnswer = "";
    let finalAnswer = "";
    let finalCitations: unknown = null;
    let finalRetrievalPath: unknown = null;

    return passthroughSseResponse(upstream, {
      onEvent: (event) => {
        if (!event.data) {
          return;
        }

        try {
          const payload = JSON.parse(event.data) as {
            event?: string;
            data?: {
              token?: string;
              answer?: string;
              citations?: unknown;
              retrieval_path?: unknown;
            };
          };

          if (payload.event === "token" && payload.data?.token) {
            accumulatedAnswer += payload.data.token;
          }

          if (payload.event === "final") {
            finalAnswer = payload.data?.answer ?? accumulatedAnswer;
            finalCitations = payload.data?.citations ?? null;
            finalRetrievalPath = payload.data?.retrieval_path ?? null;
          }
        } catch {
          // Ignore malformed events and keep streaming.
        }
      },
      onDone: async () => {
        const content = (finalAnswer || accumulatedAnswer).trim();
        if (!content) {
          return;
        }

        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "ASSISTANT",
            content,
            citations: finalCitations as unknown as Prisma.InputJsonValue,
            retrievalPath: finalRetrievalPath as unknown as Prisma.InputJsonValue,
          },
        });

        await prisma.chatSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        });
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Chat route failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
