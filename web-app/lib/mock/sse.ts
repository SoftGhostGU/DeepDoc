import type { AskSseEvent, CompareSseEvent } from "@/types/rag";

import {
  mockAnswerText,
  mockCitations,
  mockCompareAnswerHierarchical,
  mockCompareAnswerNaive,
  mockParagraphs,
  mockRetrieveResponse,
} from "@/lib/mock/data";

const encoder = new TextEncoder();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toSseChunk(eventName: string, payload: unknown) {
  return encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
}

async function emit(
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventName: string,
  payload: unknown,
) {
  controller.enqueue(toSseChunk(eventName, payload));
}

export function createMockChatStream(options?: {
  question?: string;
  onFinal?: (payload: Extract<AskSseEvent, { event: "final" }>['data']) => Promise<void> | void;
}) {
  const question = options?.question?.trim() ?? "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await sleep(200);
        await emit(controller, "stage", {
          event: "stage",
          data: {
            stage: "analyzing",
            message: "正在分析查询意图...",
          },
        } satisfies AskSseEvent);

        await sleep(300);
        await emit(controller, "stage", {
          event: "stage",
          data: {
            stage: "rewriting",
            message: "正在改写查询...",
          },
        } satisfies AskSseEvent);

        await sleep(500);
        await emit(controller, "stage", {
          event: "stage",
          data: {
            stage: "retrieving_summary",
            message: "正在检索摘要候选...",
          },
        } satisfies AskSseEvent);

        await emit(controller, "retrieval_summary", {
          event: "retrieval_summary",
          data: {
            chunks: mockRetrieveResponse.results,
          },
        } satisfies AskSseEvent);

        await sleep(400);
        await emit(controller, "stage", {
          event: "stage",
          data: {
            stage: "retrieving_paragraphs",
            message: "正在检索源段落...",
          },
        } satisfies AskSseEvent);

        await emit(controller, "retrieval_paragraphs", {
          event: "retrieval_paragraphs",
          data: {
            paragraphs: mockParagraphs,
          },
        } satisfies AskSseEvent);

        await emit(controller, "stage", {
          event: "stage",
          data: {
            stage: "generating",
            message: "正在生成回答...",
          },
        } satisfies AskSseEvent);

        const answer = question
          ? `${mockAnswerText}\n\n问题重点：${question}`
          : mockAnswerText;

        for (const token of answer.split(" ")) {
          await sleep(35 + Math.floor(Math.random() * 15));
          await emit(controller, "token", {
            event: "token",
            data: {
              stage: "generating",
              token: `${token} `,
            },
          } satisfies AskSseEvent);
        }

        const finalPayload: Extract<AskSseEvent, { event: "final" }>['data'] = {
          answer,
          citations: mockCitations,
          retrieval_path: mockRetrieveResponse.retrieval_path,
        };

        await emit(controller, "final", {
          event: "final",
          data: finalPayload,
        } satisfies AskSseEvent);

        if (options?.onFinal) {
          await options.onFinal(finalPayload);
        }

        controller.close();
      } catch (error) {
        await emit(controller, "error", {
          event: "error",
          data: {
            message:
              error instanceof Error
                ? error.message
                : "Mock chat stream failed unexpectedly",
          },
        } satisfies AskSseEvent);
        controller.close();
      }
    },
  });
}

export function createMockCompareStream(options?: {
  question?: string;
}) {
  const question = options?.question?.trim() ?? "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await sleep(180);
        await emit(controller, "stage", {
          event: "stage",
          data: {
            stage: "analyzing",
            message: "正在准备对比查询...",
          },
        } satisfies CompareSseEvent);

        const naiveAnswer = question
          ? `${mockCompareAnswerNaive}（问题：${question}）`
          : mockCompareAnswerNaive;
        const hierarchicalAnswer = question
          ? `${mockCompareAnswerHierarchical}（问题：${question}）`
          : mockCompareAnswerHierarchical;

        for (const token of naiveAnswer.split(" ")) {
          await sleep(25);
          await emit(controller, "compare_track", {
            event: "compare_track",
            data: {
              track: "naive",
              token: `${token} `,
            },
          } satisfies CompareSseEvent);
        }

        await emit(controller, "compare_track", {
          event: "compare_track",
          data: {
            track: "naive",
            answer: naiveAnswer,
            citations: [mockCitations[1]].filter(Boolean),
            done: true,
          },
        } satisfies CompareSseEvent);

        await sleep(140);

        for (const token of hierarchicalAnswer.split(" ")) {
          await sleep(40);
          await emit(controller, "compare_track", {
            event: "compare_track",
            data: {
              track: "hierarchical",
              token: `${token} `,
            },
          } satisfies CompareSseEvent);
        }

        await emit(controller, "compare_track", {
          event: "compare_track",
          data: {
            track: "hierarchical",
            answer: hierarchicalAnswer,
            citations: mockCitations,
            done: true,
          },
        } satisfies CompareSseEvent);

        await emit(controller, "final", {
          event: "final",
          data: {
            answer: "对比完成",
            citations: mockCitations,
          },
        } satisfies CompareSseEvent);

        controller.close();
      } catch (error) {
        await emit(controller, "error", {
          event: "error",
          data: {
            message:
              error instanceof Error
                ? error.message
                : "Mock compare stream failed unexpectedly",
          },
        } satisfies CompareSseEvent);
        controller.close();
      }
    },
  });
}
