import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createMockChatStream } from "@/lib/mock/sse";
import {
  forwardJsonToRag,
  isMockMode,
  passthroughSseResponse,
  SSE_HEADERS,
} from "@/lib/rag-client";

export const runtime = "nodejs";

type ChatRequest = {
  doc_id: string;
  query: string;
  session_id?: string;
  mode?: "hierarchical" | "naive";
};

async function ensureSession(documentId: string, sessionId: string | undefined, query: string) {
  if (!sessionId) {
    return prisma.chatSession.create({
      data: {
        documentId,
        title: query.slice(0, 64),
      },
    });
  }

  const existing = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (existing) {
    if (existing.documentId !== documentId) {
      return null;
    }

    return existing;
  }

  return prisma.chatSession.create({
    data: {
      id: sessionId,
      documentId,
      title: query.slice(0, 64),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const query = body.query?.trim();

    if (!body.doc_id || !query) {
      return NextResponse.json(
        { error: "doc_id and non-empty query are required" },
        { status: 400 },
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: body.doc_id },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const session = await ensureSession(body.doc_id, body.session_id, query);

    if (!session) {
      return NextResponse.json(
        {
          error: "Session does not belong to the requested document",
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
      const stream = createMockChatStream({
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
      doc_id: body.doc_id,
      query,
      mode: body.mode ?? "hierarchical",
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
