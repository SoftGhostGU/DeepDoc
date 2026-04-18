type ParsePayload = {
  doc_id?: string;
  structure_tree?: unknown;
  stats?: {
    page_count?: number;
  };
};

type IndexPayload = {
  doc_id?: string;
  indices?: unknown;
  build_time?: number;
};

type RagResponse = Pick<Response, "ok" | "status" | "json" | "text">;

type ParseAndIndexDocumentOptions = {
  file: File;
  forwardMultipartToRag: (endpoint: string, formData: FormData) => Promise<RagResponse>;
  forwardJsonToRag: <TBody>(endpoint: string, body: TBody) => Promise<RagResponse>;
};

type ParseDocumentOptions = Pick<ParseAndIndexDocumentOptions, "file" | "forwardMultipartToRag">;

type IndexDocumentOptions = Pick<ParseAndIndexDocumentOptions, "forwardJsonToRag"> & {
  ragDocumentId: string;
};

import type { ParsedUploadError } from "./upload-error.ts";
import { parseUploadErrorResponse } from "./upload-error.ts";

export class RagUploadError extends Error {
  stage: "parse" | "index";
  status: number;
  detail: string;
  code?: string;
  ragDocumentId?: string;
  parsePayload?: ParsePayload;

  constructor(
    stage: "parse" | "index",
    parsedError: ParsedUploadError,
    options?: {
      code?: string;
      detail?: string;
      ragDocumentId?: string;
      parsePayload?: ParsePayload;
    },
  ) {
    super(parsedError.error);
    this.name = "RagUploadError";
    this.stage = stage;
    this.status = parsedError.status;
    this.code = options?.code ?? parsedError.code;
    this.detail = options?.detail ?? parsedError.detail ?? parsedError.error;
    this.ragDocumentId = options?.ragDocumentId;
    this.parsePayload = options?.parsePayload;
  }
}

async function readResponseError(response: RagResponse): Promise<ParsedUploadError> {
  try {
    return parseUploadErrorResponse(response.status, await response.text());
  } catch {
    return {
      status: response.status,
      error: `Upload failed with status ${response.status}`,
      detail: "Unknown upstream error",
    };
  }
}

export async function parseDocumentThroughRag({
  file,
  forwardMultipartToRag,
}: ParseDocumentOptions) {
  const ragForm = new FormData();
  ragForm.append("file", file, file.name);

  const parseResponse = await forwardMultipartToRag("/api/documents/parse", ragForm);
  if (!parseResponse.ok) {
    throw new RagUploadError("parse", await readResponseError(parseResponse));
  }

  const parsePayload = (await parseResponse.json()) as ParsePayload;
  const ragDocumentId = parsePayload.doc_id?.trim();
  if (!ragDocumentId) {
    throw new RagUploadError("parse", {
      status: 502,
      error: "RAG parse response did not include a document id",
      detail: "RAG parse response did not include a document id",
    });
  }

  return {
    ragDocumentId,
    parsePayload,
  };
}

export async function indexParsedDocument({
  ragDocumentId,
  forwardJsonToRag,
}: IndexDocumentOptions) {
  const indexResponse = await forwardJsonToRag(`/api/documents/${ragDocumentId}/index`, {
    doc_id: ragDocumentId,
    strategies: ["hierarchical"],
  });
  if (!indexResponse.ok) {
    throw new RagUploadError("index", await readResponseError(indexResponse), {
      ragDocumentId,
    });
  }

  return (await indexResponse.json()) as IndexPayload;
}

export async function parseAndIndexDocument({
  file,
  forwardMultipartToRag,
  forwardJsonToRag,
}: ParseAndIndexDocumentOptions) {
  const { ragDocumentId, parsePayload } = await parseDocumentThroughRag({
    file,
    forwardMultipartToRag,
  });

  let indexPayload: IndexPayload;
  try {
    indexPayload = await indexParsedDocument({
      ragDocumentId,
      forwardJsonToRag,
    });
  } catch (error) {
    if (error instanceof RagUploadError) {
      error.ragDocumentId = ragDocumentId;
      error.parsePayload = parsePayload;
    }
    throw error;
  }

  return {
    ragDocumentId,
    parsePayload,
    indexPayload,
  };
}
