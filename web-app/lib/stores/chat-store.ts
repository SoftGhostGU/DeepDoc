import { create } from "zustand";
import { createParser } from "eventsource-parser";

import type { ChatMessage, ChatSession } from "@/types";
import type {
  AskSseEvent,
  ParagraphItem,
  RagStage,
  RetrievedChunk,
  StageTimestamp,
} from "@/types/rag";

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}`;

const nowIso = () => new Date().toISOString();

type MessagePatch = Partial<Pick<ChatMessage, "content" | "citations" | "retrievalPath">>;

type ChatApiError = {
  error?: string;
  detail?: string;
  code?: string;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

interface ChatStore {
  sessionsByDocument: Record<string, ChatSession[]>;
  messagesBySession: Record<string, ChatMessage[]>;
  activeSessionIdByDocument: Record<string, string>;
  contextWindowSize: number;
  contextCleared: boolean;
  isStreaming: boolean;
  currentStage: RagStage | null;
  stageTimestamps: Record<string, StageTimestamp>;
  retrievedChunks: RetrievedChunk[];
  retrievedParagraphs: ParagraphItem[];
  tokenCount: number;
  streamError: string | null;
  loadHistory: (documentId: string) => Promise<void>;
  createSession: (documentId: string, title?: string, documentIds?: string[]) => ChatSession;
  setActiveSession: (documentId: string, sessionId: string) => void;
  setContextWindowSize: (size: number) => void;
  clearContext: (sessionId: string) => void;
  sendMessage: (payload: {
    documentId: string;
    documentIds?: string[];
    sessionId?: string;
    query: string;
    mode?: "hierarchical" | "naive";
  }) => Promise<void>;
  clearError: () => void;
}

function updateMessage(
  messagesBySession: Record<string, ChatMessage[]>,
  sessionId: string,
  messageId: string,
  patch: MessagePatch,
) {
  return {
    ...messagesBySession,
    [sessionId]: (messagesBySession[sessionId] ?? []).map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    ),
  };
}

function removeMessages(
  messagesBySession: Record<string, ChatMessage[]>,
  sessionId: string,
  messageIds: string[],
) {
  return {
    ...messagesBySession,
    [sessionId]: (messagesBySession[sessionId] ?? []).filter(
      (message) => !messageIds.includes(message.id),
    ),
  };
}

function getContextMessages(messages: ChatMessage[]) {
  let start = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "SYSTEM") {
      start = index + 1;
      break;
    }
  }

  return messages
    .slice(start)
    .filter(
      (message) =>
        (message.role === "USER" || message.role === "ASSISTANT") &&
        message.content.trim().length > 0,
    );
}

function buildHistory(messages: ChatMessage[], contextWindowSize: number): HistoryMessage[] {
  const contextMessages = getContextMessages(messages);
  const maxMessages = Math.max(contextWindowSize, 1) * 2;

  return contextMessages.slice(-maxMessages).map((message) => ({
    role: message.role === "USER" ? "user" : "assistant",
    content: message.content,
  }));
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessionsByDocument: {},
  messagesBySession: {},
  activeSessionIdByDocument: {},
  contextWindowSize: 5,
  contextCleared: false,
  isStreaming: false,
  currentStage: null,
  stageTimestamps: {},
  retrievedChunks: [],
  retrievedParagraphs: [],
  tokenCount: 0,
  streamError: null,

  loadHistory: async (documentId) => {
    const response = await fetch(`/api/history?documentId=${encodeURIComponent(documentId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load chat history");
    }

    const payload = (await response.json()) as {
      sessions: Array<ChatSession & { messages: ChatMessage[] }>;
    };

    const sessions = payload.sessions.map((session) => {
      const parsedDocumentIds = Array.isArray(session.documentIds)
        ? session.documentIds.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : [];

      return {
        id: session.id,
        title: session.title,
        documentId: session.documentId,
        documentIds: parsedDocumentIds.length > 0 ? parsedDocumentIds : undefined,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    });

    const messagesBySession: Record<string, ChatMessage[]> = {};
    for (const session of payload.sessions) {
      messagesBySession[session.id] = session.messages;
    }

    set((state) => ({
      sessionsByDocument: {
        ...state.sessionsByDocument,
        [documentId]: sessions,
      },
      messagesBySession: {
        ...state.messagesBySession,
        ...messagesBySession,
      },
      activeSessionIdByDocument: {
        ...state.activeSessionIdByDocument,
        ...(sessions[0] ? { [documentId]: sessions[0].id } : {}),
      },
    }));
  },

  createSession: (documentId, title = "New Chat", documentIds) => {
    const normalizedDocumentIds = Array.isArray(documentIds)
      ? Array.from(
          new Set(
            documentIds
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
          ),
        )
      : [];

    const session: ChatSession = {
      id: generateId(),
      documentId,
      documentIds: normalizedDocumentIds.length > 1 ? normalizedDocumentIds : undefined,
      title,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    set((state) => ({
      sessionsByDocument: {
        ...state.sessionsByDocument,
        [documentId]: [session, ...(state.sessionsByDocument[documentId] ?? [])],
      },
      activeSessionIdByDocument: {
        ...state.activeSessionIdByDocument,
        [documentId]: session.id,
      },
      messagesBySession: {
        ...state.messagesBySession,
        [session.id]: [],
      },
    }));

    return session;
  },

  setActiveSession: (documentId, sessionId) => {
    set((state) => ({
      activeSessionIdByDocument: {
        ...state.activeSessionIdByDocument,
        [documentId]: sessionId,
      },
    }));
  },

  setContextWindowSize: (size) => {
    const clamped = Math.min(Math.max(Math.round(size), 1), 10);
    set({ contextWindowSize: clamped });
  },

  clearContext: (sessionId) => {
    set((state) => {
      const currentMessages = state.messagesBySession[sessionId] ?? [];
      if (!currentMessages.length) {
        return {
          contextCleared: true,
        };
      }

      const divider: ChatMessage = {
        id: generateId(),
        sessionId,
        role: "SYSTEM",
        content: "── 上下文已清除 ──",
        createdAt: nowIso(),
      };

      return {
        contextCleared: true,
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: [...currentMessages, divider],
        },
      };
    });
  },

  sendMessage: async ({ documentId, documentIds, sessionId, query, mode = "hierarchical" }) => {
    const question = query.trim();
    if (!question) {
      return;
    }

    const normalizedDocumentIds = Array.isArray(documentIds)
      ? Array.from(
          new Set(
            documentIds
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
          ),
        )
      : [];
    const targetDocumentIds = normalizedDocumentIds.length > 1 ? normalizedDocumentIds : [documentId];
    const primaryDocumentId = targetDocumentIds[0] ?? documentId;

    const userMessageId = generateId();
    const assistantMessageId = generateId();

    const performSend = async (targetSessionId: string, allowRetry: boolean) => {
      const state = get();
      const history = buildHistory(
        state.messagesBySession[targetSessionId] ?? [],
        state.contextWindowSize,
      );

      const userMessage: ChatMessage = {
        id: userMessageId,
        sessionId: targetSessionId,
        role: "USER",
        content: question,
        createdAt: nowIso(),
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId: targetSessionId,
        role: "ASSISTANT",
        content: "",
        createdAt: nowIso(),
      };

      set((prev) => ({
        contextCleared: false,
        isStreaming: true,
        streamError: null,
        currentStage: "analyzing",
        stageTimestamps: { analyzing: { start: Date.now() } },
        retrievedChunks: [],
        retrievedParagraphs: [],
        tokenCount: 0,
        activeSessionIdByDocument: {
          ...prev.activeSessionIdByDocument,
          [primaryDocumentId]: targetSessionId,
        },
        messagesBySession: {
          ...prev.messagesBySession,
          [targetSessionId]: [
            ...(prev.messagesBySession[targetSessionId] ?? []),
            userMessage,
            assistantMessage,
          ],
        },
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(targetDocumentIds.length > 1
              ? { doc_ids: targetDocumentIds }
              : { doc_id: primaryDocumentId }),
            session_id: targetSessionId,
            query: question,
            mode,
            history,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let payload: ChatApiError | null = null;

          try {
            payload = JSON.parse(errorText) as ChatApiError;
          } catch {
            payload = null;
          }

          if (allowRetry && payload?.code === "INVALID_SESSION") {
            set((prev) => ({
              isStreaming: false,
              currentStage: null,
              messagesBySession: removeMessages(prev.messagesBySession, targetSessionId, [
                userMessageId,
                assistantMessageId,
              ]),
            }));

            const recoveredSession = get().createSession(
              primaryDocumentId,
              question.slice(0, 40),
              targetDocumentIds.length > 1 ? targetDocumentIds : undefined,
            );
            await performSend(recoveredSession.id, false);
            return;
          }

          throw new Error(payload?.detail ?? payload?.error ?? `Chat request failed (${response.status})`);
        }

        if (!response.body) {
          throw new Error("Chat request returned no stream body");
        }

        const decoder = new TextDecoder();

        const parser = createParser({
          onEvent: (event) => {
            if (!event.data) {
              return;
            }

            let parsed: AskSseEvent;
            try {
              parsed = JSON.parse(event.data) as AskSseEvent;
            } catch {
              return;
            }

            if (parsed.event === "stage") {
              set((prev) => {
                const now = Date.now();
                const prevStage = prev.currentStage;
                const timestamps = { ...prev.stageTimestamps };
                if (prevStage && timestamps[prevStage] && !timestamps[prevStage].end) {
                  timestamps[prevStage] = { ...timestamps[prevStage], end: now };
                }
                timestamps[parsed.data.stage] = { start: now };
                return { currentStage: parsed.data.stage, stageTimestamps: timestamps };
              });
              return;
            }

            if (parsed.event === "token") {
              set((prev) => ({
                tokenCount: prev.tokenCount + 1,
                messagesBySession: updateMessage(
                  prev.messagesBySession,
                  targetSessionId,
                  assistantMessageId,
                  {
                    content: `${
                      (prev.messagesBySession[targetSessionId] ?? []).find(
                        (message) => message.id === assistantMessageId,
                      )?.content ?? ""
                    }${parsed.data.token}`,
                  },
                ),
              }));
              return;
            }

            if (parsed.event === "retrieval_summary") {
              set(() => ({
                retrievedChunks: parsed.data.chunks,
              }));
              return;
            }

            if (parsed.event === "retrieval_paragraphs") {
              set(() => ({
                retrievedParagraphs: parsed.data.paragraphs,
              }));
              return;
            }

            if (parsed.event === "final") {
              set((prev) => {
                const now = Date.now();
                const timestamps = { ...prev.stageTimestamps };
                const lastStage = prev.currentStage;
                if (lastStage && timestamps[lastStage] && !timestamps[lastStage].end) {
                  timestamps[lastStage] = { ...timestamps[lastStage], end: now };
                }
                return {
                  isStreaming: false,
                  currentStage: null,
                  stageTimestamps: timestamps,
                  messagesBySession: updateMessage(
                    prev.messagesBySession,
                    targetSessionId,
                    assistantMessageId,
                    {
                      content: parsed.data.answer,
                      citations: parsed.data.citations,
                      retrievalPath: parsed.data.retrieval_path,
                    },
                  ),
                };
              });
              return;
            }

            if (parsed.event === "error") {
              set((prev) => {
                const now = Date.now();
                const timestamps = { ...prev.stageTimestamps };
                const lastStage = prev.currentStage;
                if (lastStage && timestamps[lastStage] && !timestamps[lastStage].end) {
                  timestamps[lastStage] = { ...timestamps[lastStage], end: now };
                }
                return {
                  isStreaming: false,
                  currentStage: null,
                  stageTimestamps: timestamps,
                  streamError: parsed.data.message,
                };
              });
            }
          },
        });

        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          parser.feed(decoder.decode(value, { stream: true }));
        }

        set((prev) => {
          const now = Date.now();
          const timestamps = { ...prev.stageTimestamps };
          const lastStage = prev.currentStage;
          if (lastStage && timestamps[lastStage] && !timestamps[lastStage].end) {
            timestamps[lastStage] = { ...timestamps[lastStage], end: now };
          }
          return {
            isStreaming: false,
            currentStage: null,
            stageTimestamps: timestamps,
          };
        });
      } catch (error) {
        set((prev) => {
          const now = Date.now();
          const timestamps = { ...prev.stageTimestamps };
          const lastStage = prev.currentStage;
          if (lastStage && timestamps[lastStage] && !timestamps[lastStage].end) {
            timestamps[lastStage] = { ...timestamps[lastStage], end: now };
          }
          return {
            isStreaming: false,
            currentStage: null,
            stageTimestamps: timestamps,
            streamError: error instanceof Error ? error.message : "Failed to stream response",
          };
        });
      }
    };

    const state = get();
    const activeSessionId =
      sessionId ??
      state.activeSessionIdByDocument[primaryDocumentId] ??
      state.createSession(
        primaryDocumentId,
        question.slice(0, 40),
        targetDocumentIds.length > 1 ? targetDocumentIds : undefined,
      ).id;

    await performSend(activeSessionId, true);
  },

  clearError: () => set({ streamError: null }),
}));
