import path from "node:path";
import { unlink } from "node:fs/promises";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get("id");

    const idFromBody =
      request.headers.get("content-type")?.includes("application/json")
        ? ((await request.json()) as { id?: string }).id
        : undefined;

    const documentId = idFromQuery ?? idFromBody;

    if (!documentId) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    try {
      await unlink(path.join(UPLOAD_DIR, document.filename));
    } catch {
      // Ignore missing files to keep deletion idempotent.
    }

    return NextResponse.json({ success: true, id: documentId });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete document",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
