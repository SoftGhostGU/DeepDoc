import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildMockParseResponse } from "@/lib/mock/data";
import { forwardJsonToRag, forwardMultipartToRag, isMockMode } from "@/lib/rag-client";
import { parseAndIndexDocument, RagUploadError } from "@/lib/rag-upload";
import { setDocumentRagDocumentId } from "@/lib/rag-sync-store";

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

    const { ragDocumentId, parsePayload } = await parseAndIndexDocument({
      file,
      forwardMultipartToRag,
      forwardJsonToRag,
    });

    const updatedDocument = await prisma.document.update({
      where: { id: createdDocument.id },
      data: {
        status: "INDEXED",
        structureTree: (parsePayload.structure_tree ?? null) as unknown as Prisma.InputJsonValue,
        pageCount: parsePayload.stats?.page_count,
      },
    });
    await setDocumentRagDocumentId(prisma, createdDocument.id, ragDocumentId);

    return NextResponse.json({
      document: updatedDocument,
      parse: parsePayload,
      mode: "real",
    });
  } catch (error) {
    if (error instanceof RagUploadError) {
      if (createdDocumentId) {
        await prisma.document.update({
          where: { id: createdDocumentId },
          data: { status: "FAILED" },
        });
      }

      return NextResponse.json(
        {
          error: `RAG ${error.stage} failed`,
          detail: error.detail,
        },
        { status: error.status },
      );
    }

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
