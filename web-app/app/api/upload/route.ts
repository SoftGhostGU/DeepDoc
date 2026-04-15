import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildMockParseResponse } from "@/lib/mock/data";
import { forwardMultipartToRag, isMockMode } from "@/lib/rag-client";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  let createdDocumentId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const safeOriginalName = sanitizeFilename(file.name);
    const storedName = `${Date.now()}-${safeOriginalName}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    const destination = path.join(UPLOAD_DIR, storedName);
    await writeFile(destination, Buffer.from(arrayBuffer));

    const createdDocument = await prisma.document.create({
      data: {
        filename: storedName,
        originalName: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        status: "PARSING",
      },
    });
    createdDocumentId = createdDocument.id;

    if (isMockMode()) {
      const mockParse = buildMockParseResponse(createdDocument.id);

      const updatedDocument = await prisma.document.update({
        where: { id: createdDocument.id },
        data: {
          status: "INDEXED",
          structureTree: mockParse.structure_tree as unknown as Prisma.InputJsonValue,
          pageCount: mockParse.stats.page_count,
        },
      });

      return NextResponse.json({
        document: updatedDocument,
        parse: mockParse,
        mode: "mock",
      });
    }

    const ragForm = new FormData();
    ragForm.append("file", file, file.name);

    const upstream = await forwardMultipartToRag("/api/documents/parse", ragForm);
    if (!upstream.ok) {
      await prisma.document.update({
        where: { id: createdDocument.id },
        data: { status: "FAILED" },
      });

      const errorText = await upstream.text();
      return NextResponse.json(
        { error: "RAG parse failed", detail: errorText },
        { status: upstream.status },
      );
    }

    const parsePayload = (await upstream.json()) as {
      structure_tree?: unknown;
      stats?: { page_count?: number };
    };

    const updatedDocument = await prisma.document.update({
      where: { id: createdDocument.id },
      data: {
        status: "INDEXED",
        structureTree: (parsePayload.structure_tree ?? null) as unknown as Prisma.InputJsonValue,
        pageCount: parsePayload.stats?.page_count,
      },
    });

    return NextResponse.json({
      document: updatedDocument,
      parse: parsePayload,
      mode: "real",
    });
  } catch (error) {
    if (createdDocumentId) {
      try {
        await prisma.document.update({
          where: { id: createdDocumentId },
          data: { status: "FAILED" },
        });
      } catch {
        // Surface the original upload error even if failure recovery also fails.
      }
    }

    return NextResponse.json(
      {
        error: "Upload failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
