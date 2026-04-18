import path from "node:path";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildMockParseResponse } from "@/lib/mock/data";
import { forwardJsonToRag, forwardMultipartToRag, isMockMode } from "@/lib/rag-client";
import { indexParsedDocument, parseDocumentThroughRag, RagUploadError } from "@/lib/rag-upload";
import { setDocumentRagDocumentId } from "@/lib/rag-sync-store";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatFileSize(sizeInBytes: number) {
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)}MB`;
}

export async function POST(request: Request) {
  let createdDocumentId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: "File too large",
          detail: `File exceeds maximum size: ${formatFileSize(MAX_UPLOAD_BYTES)}`,
        },
        { status: 413 },
      );
    }

    const safeOriginalName = sanitizeFilename(file.name);
    const storedName = `${Date.now()}-${safeOriginalName}`;
    const destination = path.join(UPLOAD_DIR, storedName);

    await mkdir(UPLOAD_DIR, { recursive: true });
    try {
      const source = Readable.fromWeb(
        file.stream() as unknown as Parameters<typeof Readable.fromWeb>[0],
      );
      const sink = createWriteStream(destination, { flags: "wx" });
      await pipeline(source, sink);
    } catch (writeError) {
      const code = (writeError as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        await unlink(destination).catch(() => undefined);
      }
      throw writeError;
    }

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

    const { ragDocumentId, parsePayload } = await parseDocumentThroughRag({
      file,
      forwardMultipartToRag,
    });
    await setDocumentRagDocumentId(prisma, createdDocument.id, ragDocumentId);
    await prisma.document.update({
      where: { id: createdDocument.id },
      data: {
        structureTree: (parsePayload.structure_tree ?? null) as unknown as Prisma.InputJsonValue,
        pageCount: parsePayload.stats?.page_count,
      },
    });

    await indexParsedDocument({
      ragDocumentId,
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

    return NextResponse.json({
      document: updatedDocument,
      parse: parsePayload,
      mode: "real",
    });
  } catch (error) {
    if (error instanceof RagUploadError) {
      if (createdDocumentId) {
        if (error.ragDocumentId) {
          await setDocumentRagDocumentId(prisma, createdDocumentId, error.ragDocumentId);
        }

        await prisma.document.update({
          where: { id: createdDocumentId },
          data: {
            status: "FAILED",
            ...(error.parsePayload
              ? {
                  structureTree: (error.parsePayload.structure_tree ?? null) as unknown as Prisma.InputJsonValue,
                  pageCount: error.parsePayload.stats?.page_count,
                }
              : {}),
          },
        });
      }

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
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
