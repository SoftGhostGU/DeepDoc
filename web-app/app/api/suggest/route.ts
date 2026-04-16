import { NextResponse } from "next/server";

import { mockSuggestedQuestions } from "@/lib/mock/data";
import { getRagServiceUrl, isMockMode } from "@/lib/rag-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const docId = url.searchParams.get("docId") ?? url.searchParams.get("doc_id");

    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    if (isMockMode()) {
      return NextResponse.json(mockSuggestedQuestions);
    }

    const upstream = await fetch(
      `${getRagServiceUrl().replace(/\/$/, "")}/api/suggest?doc_id=${encodeURIComponent(docId)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      return NextResponse.json(
        { error: "RAG suggest request failed", detail },
        { status: upstream.status },
      );
    }

    const payload = (await upstream.json()) as unknown;
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Suggest route failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
