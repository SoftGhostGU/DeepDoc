import { create } from "zustand";
import { createParser } from "eventsource-parser";

import type { ChatMessage, ChatSession } from "@/types";
import type { AskSseEvent, RagStage } from "@/types/rag";

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

interface ChatStore {
  sessionsByDocument: Record<string, ChatSession[]>;
  messagesBySession: Record<string, ChatMessage[]>;
  activeSessionIdByDocument: Record<string, string>;
  isStreaming: boolean;
  currentStage: RagStage | null;
  streamError: string | null;
  loadHistory: (documentId: string) => Promise<void>;
  createSession: (documentId: string, title?: string) => ChatSession;
  setActiveSession: (documentId: string, sessionId: string) => void;
  sendMessage: (payload: {
    documentId: string;
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

export const useChatStore = create<ChatStore>((set, get) => ({
  sessionsByDocument: {},
  messagesBySession: {},
  activeSessionIdByDocument: {},
  isStreaming: false,
  currentStage: null,
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

    const sessions = payload.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      documentId: session.documentId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));

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

  createSession: (documentId, title = "New Chat") => {
    const session: ChatSession = {
      id: generateId(),
      documentId,
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

  sendMessage: async ({ documentId, sessionId, query, mode = "hierarchical" }) => {
    const question = query.trim();
    if (!question) {
      return;
    }

    const userMessageId = generateId();
    const assistantMessageId = generateId();

    const performSend = async (targetSessionId: string, allowRetry: boolean) => {
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
        isStreaming: true,
        streamError: null,
        currentStage: "analyzing",
        activeSessionIdByDocument: {
          ...prev.activeSessionIdByDocument,
          [documentId]: targetSessionId,
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
            doc_id: documentId,
            session_id: targetSessionId,
            query: question,
            mode,
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

            const recoveredSession = get().createSession(documentId, question.slice(0, 40));
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
              set({ currentStage: parsed.data.stage });
              return;
            }

            if (parsed.event === "token") {
              set((prev) => ({
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

            if (parsed.event === "final") {
              set((prev) => ({
                isStreaming: false,
                currentStage: null,
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
              }));
              return;
            }

            if (parsed.event === "error") {
              set({
                isStreaming: false,
                currentStage: null,
                streamError: parsed.data.message,
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

        set({
          isStreaming: false,
          currentStage: null,
        });
      } catch (error) {
        set({
          isStreaming: false,
          currentStage: null,
          streamError: error instanceof Error ? error.message : "Failed to stream response",
        });
      }
    };

    const state = get();
    const activeSessionId =
      sessionId ??
      state.activeSessionIdByDocument[documentId] ??
      state.createSession(documentId, question.slice(0, 40)).id;

    await performSend(activeSessionId, true);
  },

  clearError: () => set({ streamError: null }),
}));
