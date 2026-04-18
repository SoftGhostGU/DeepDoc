export type ParsedUploadError = {
  status: number;
  error: string;
  code?: string;
  detail?: string;
};

type ErrorLikePayload = {
  error?: unknown;
  message?: unknown;
  code?: unknown;
  detail?: unknown;
};

function asString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asObject(value: unknown): ErrorLikePayload | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as ErrorLikePayload;
}

export function parseUploadErrorResponse(status: number, responseText: string): ParsedUploadError {
  const fallbackError = `Upload failed with status ${status}`;
  const normalizedText = responseText.trim();

  if (!normalizedText) {
    return {
      status,
      error: fallbackError,
      code: undefined,
      detail: undefined,
    };
  }

  try {
    const parsed = asObject(JSON.parse(normalizedText));
    if (!parsed) {
      throw new Error("response was not an object");
    }

    const error = asString(parsed.error) ?? asString(parsed.message) ?? fallbackError;
    const detail = asString(parsed.detail);
    const code = asString(parsed.code);

    return {
      status,
      error,
      code,
      detail,
    };
  } catch {
    return {
      status,
      error: fallbackError,
      code: undefined,
      detail: normalizedText,
    };
  }
}
