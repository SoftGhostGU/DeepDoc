import { NextResponse } from "next/server";

import { mockSuggestedQuestions } from "@/lib/mock/data";
import { getRagServiceUrl, isMockMode } from "@/lib/rag-client";
import { prisma } from "@/lib/prisma";
import { RagDocumentSyncError, resolveSingleRagDocumentId } from "@/lib/rag-sync";
import { getSyncableDocumentById } from "@/lib/rag-sync-store";

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

    const document = await getSyncableDocumentById(prisma, docId);
    const ragDocumentId = resolveSingleRagDocumentId(document);

    const upstream = await fetch(`${getRagServiceUrl().replace(/\/$/, "")}/api/suggest`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ doc_id: ragDocumentId }),
    });

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
        error: "Suggest route failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
