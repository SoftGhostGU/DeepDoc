"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { ChatInput } from "@/components/rag/chat-input";
import { ChatMessage } from "@/components/rag/chat-message";
import { CitationPanel } from "@/components/rag/citation-panel";
import { StageIndicator } from "@/components/rag/stage-indicator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/lib/stores/chat-store";
import type { Citation } from "@/types";

interface ChatWindowProps {
  documentId: string;
  sessionId?: string;
}

export function ChatWindow({ documentId, sessionId }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [contextCitation, setContextCitation] = useState<Citation | null>(null);

  const {
    messagesBySession,
    isStreaming,
    currentStage,
    streamError,
    clearError,
    sendMessage,
  } = useChatStore(useShallow((state) => ({
    messagesBySession: state.messagesBySession,
    isStreaming: state.isStreaming,
    currentStage: state.currentStage,
    streamError: state.streamError,
    clearError: state.clearError,
    sendMessage: state.sendMessage,
  })));

  const messages = useMemo(
    () => (sessionId ? messagesBySession[sessionId] ?? [] : []),
    [messagesBySession, sessionId],
  );

  const latestAssistantWithCitations = useMemo(() => {
    return [...messages]
      .reverse()
      .find((message) => message.role === "ASSISTANT" && (message.citations?.length ?? 0) > 0);
  }, [messages]);

  const selectedMessageWithCitations = useMemo(() => {
    if (selectedMessageId) {
      const selectedMessage = messages.find(
        (message) =>
          message.id === selectedMessageId &&
          message.role === "ASSISTANT" &&
          (message.citations?.length ?? 0) > 0,
      );

      if (selectedMessage) {
        return selectedMessage;
      }
    }

    return latestAssistantWithCitations ?? null;
  }, [latestAssistantWithCitations, messages, selectedMessageId]);

  const panelCitations = selectedMessageWithCitations?.citations ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, currentStage]);

  const effectiveSelectedCitation =
    selectedCitation && panelCitations.some((citation) => citation.id === selectedCitation.id)
      ? selectedCitation
      : null;

  const effectiveContextCitation =
    contextCitation && panelCitations.some((citation) => citation.id === contextCitation.id)
      ? contextCitation
      : null;

  return (
    <div className="grid h-full min-h-[70vh] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-700/70 bg-[#0f1d32]/90 p-3 shadow-[0_18px_42px_rgba(2,8,23,0.45)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-cyan-100">对话</h2>
          <StageIndicator stage={currentStage} />
        </div>

        <ScrollArea className="min-h-0 flex-1 rounded-lg border border-slate-700/75 bg-[#091a30]/92 p-3">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-600/70 bg-[#0f1d32]/85 p-4 text-sm text-slate-400">
                向文档提问，开始智能问答吧
              </p>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                selectedCitationId={effectiveSelectedCitation?.id}
                onCitationClick={(messageId, citation) => {
                  setSelectedMessageId(messageId);
                  setSelectedCitation(citation);
                  setContextCitation(null);
                }}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {streamError && (
          <div className="flex items-center justify-between rounded-md border border-rose-300/40 bg-rose-500/18 px-3 py-2 text-xs text-rose-100">
            <span>{streamError}</span>
            <Button size="sm" variant="ghost" onClick={clearError}>
              关闭
            </Button>
          </div>
        )}

        <ChatInput
          disabled={isStreaming || !sessionId}
          onSubmit={(query) =>
            sendMessage({
              documentId,
              sessionId,
              query,
            })
          }
        />
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <CitationPanel
          citations={panelCitations}
          selectedId={effectiveSelectedCitation?.id}
          onSelect={(citation) => {
            setSelectedCitation(citation);
            setContextCitation(null);
          }}
          onViewContext={(citation) => {
            setSelectedCitation(citation);
            setContextCitation(citation);
          }}
        />

        {effectiveContextCitation && (
          <section className="animate-fade-in-up rounded-xl border border-slate-700/65 bg-[#0f1d32]/92 p-4 shadow-[0_14px_36px_rgba(2,8,23,0.36)]">
            <h3 className="text-sm font-semibold text-cyan-100">上下文视图</h3>
            <p className="mt-1 text-xs text-slate-400">{effectiveContextCitation.path.join(" > ")}</p>
            <p className="mt-3 rounded-md border border-amber-300/30 bg-amber-400/14 px-3 py-2 text-sm text-amber-50">
              {effectiveContextCitation.text}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
