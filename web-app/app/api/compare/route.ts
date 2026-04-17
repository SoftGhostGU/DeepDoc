import { NextResponse } from "next/server";

import { createMockCompareStream } from "@/lib/mock/sse";
import { prisma } from "@/lib/prisma";
import {
  forwardJsonToRag,
  isMockMode,
  passthroughSseResponse,
  SSE_HEADERS,
} from "@/lib/rag-client";
import { RagDocumentSyncError, resolveSingleRagDocumentId } from "@/lib/rag-sync";
import { getSyncableDocumentById } from "@/lib/rag-sync-store";

export const runtime = "nodejs";

type CompareRequest = {
  doc_id: string;
  query: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompareRequest;
    const query = body.query?.trim();

    if (!body.doc_id || !query) {
      return NextResponse.json(
        { error: "doc_id and non-empty query are required" },
        { status: 400 },
      );
    }

    if (isMockMode()) {
      const stream = createMockCompareStream({ question: query });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    const document = await getSyncableDocumentById(prisma, body.doc_id);
    const ragDocumentId = resolveSingleRagDocumentId(document);

    const upstream = await forwardJsonToRag("/api/compare", {
      doc_id: ragDocumentId,
      query,
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return NextResponse.json(
        { error: "RAG compare request failed", detail },
        { status: upstream.status },
      );
    }

    return passthroughSseResponse(upstream);
  } catch (error) {
    if (error instanceof RagDocumentSyncError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "Compare route failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
