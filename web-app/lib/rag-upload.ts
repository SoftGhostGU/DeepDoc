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

export class RagUploadError extends Error {
  stage: "parse" | "index";
  status: number;
  detail: string;

  constructor(stage: "parse" | "index", status: number, detail: string) {
    super(detail);
    this.name = "RagUploadError";
    this.stage = stage;
    this.status = status;
    this.detail = detail;
  }
}

async function readResponseDetail(response: RagResponse) {
  try {
    return await response.text();
  } catch {
    return "Unknown upstream error";
  }
}

export async function parseAndIndexDocument({
  file,
  forwardMultipartToRag,
  forwardJsonToRag,
}: ParseAndIndexDocumentOptions) {
  const ragForm = new FormData();
  ragForm.append("file", file, file.name);

  const parseResponse = await forwardMultipartToRag("/api/documents/parse", ragForm);
  if (!parseResponse.ok) {
    throw new RagUploadError("parse", parseResponse.status, await readResponseDetail(parseResponse));
  }

  const parsePayload = (await parseResponse.json()) as ParsePayload;
  const ragDocumentId = parsePayload.doc_id?.trim();
  if (!ragDocumentId) {
    throw new RagUploadError("parse", 502, "RAG parse response did not include a document id");
  }

  const indexResponse = await forwardJsonToRag(`/api/documents/${ragDocumentId}/index`, {
    doc_id: ragDocumentId,
    strategies: ["hierarchical"],
  });
  if (!indexResponse.ok) {
    throw new RagUploadError("index", indexResponse.status, await readResponseDetail(indexResponse));
  }

  const indexPayload = (await indexResponse.json()) as IndexPayload;

  return {
    ragDocumentId,
    parsePayload,
    indexPayload,
  };
}
