import { createParser, type EventSourceMessage } from "eventsource-parser";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

export function isMockMode() {
  return !process.env.RAG_SERVICE_URL?.trim();
}

export function getRagServiceUrl() {
  const base = process.env.RAG_SERVICE_URL?.trim();
  if (!base) {
    throw new Error("RAG_SERVICE_URL is not configured");
  }

  return base;
}

function joinUrl(baseUrl: string, endpoint: string) {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl.replace(/\/$/, "")}${normalizedEndpoint}`;
}

export async function forwardJsonToRag<TBody>(endpoint: string, body: TBody) {
  const baseUrl = getRagServiceUrl();
  const response = await fetch(joinUrl(baseUrl, endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}

export async function forwardMultipartToRag(endpoint: string, formData: FormData) {
  const baseUrl = getRagServiceUrl();
  const response = await fetch(joinUrl(baseUrl, endpoint), {
    method: "POST",
    body: formData,
  });

  return response;
}

export function passthroughSseResponse(
  upstream: Response,
  options?: {
    onEvent?: (event: EventSourceMessage) => Promise<void> | void;
    onDone?: () => Promise<void> | void;
  },
) {
  if (!upstream.body) {
    throw new Error("Upstream SSE response has no body stream");
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body?.getReader();

      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: (event) => {
          if (options?.onEvent) {
            void options.onEvent(event);
          }
        },
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (value) {
            parser.feed(decoder.decode(value, { stream: true }));
            controller.enqueue(value);
          }
        }

        if (options?.onDone) {
          await options.onDone();
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: upstream.status,
    headers: SSE_HEADERS,
  });
}
