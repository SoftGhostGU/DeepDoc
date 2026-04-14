import { NextResponse } from "next/server";

import { createMockCompareStream } from "@/lib/mock/sse";
import {
  forwardJsonToRag,
  isMockMode,
  passthroughSseResponse,
  SSE_HEADERS,
} from "@/lib/rag-client";

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

    const upstream = await forwardJsonToRag("/api/compare", {
      doc_id: body.doc_id,
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
    return NextResponse.json(
      {
        error: "Compare route failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
