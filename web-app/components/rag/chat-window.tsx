"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { ChatInput } from "@/components/rag/chat-input";
import { ChatMessage } from "@/components/rag/chat-message";
import { CitationPanel } from "@/components/rag/citation-panel";
import { ContextManager } from "@/components/rag/context-manager";
import { DocumentHeatmap } from "@/components/rag/document-heatmap";
import { DocumentMindmap } from "@/components/rag/document-mindmap";
import { DocumentOverview } from "@/components/rag/document-overview";
import { PerformanceDashboard } from "@/components/rag/performance-dashboard";
import { RetrievalFlow } from "@/components/rag/retrieval-flow";
import { StageIndicator } from "@/components/rag/stage-indicator";
import { SuggestedQuestions } from "@/components/rag/suggested-questions";
import { ThoughtTimeline } from "@/components/rag/thought-timeline";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockDocumentOverview, mockDocumentTree, mockParagraphs } from "@/lib/mock/data";
import { useChatStore } from "@/lib/stores/chat-store";
import type { Citation, Document } from "@/types";

interface ChatWindowProps {
  documentId: string;
  documentIds?: string[];
  sessionId?: string;
  document?: Document;
}

function countSectionsFromTree(node: unknown): number {
  if (!node || typeof node !== "object") {
    return 0;
  }

  const children = (node as { children?: unknown }).children;
  if (!Array.isArray(children)) {
    return 0;
  }

  return children.reduce((total, child) => total + 1 + countSectionsFromTree(child), 0);
}

function getSummaryFromTree(node: unknown): string | undefined {
  if (!node || typeof node !== "object") {
    return undefined;
  }

  const summary = (node as { summary?: unknown }).summary;
  return typeof summary === "string" && summary.trim() ? summary : undefined;
}

function normalizeSuggestedQuestions(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  const wrapped = payload as { questions?: unknown };
  if (!Array.isArray(wrapped.questions)) {
    return [];
  }

  return wrapped.questions.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function ChatWindow({ documentId, documentIds, sessionId, document }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [contextCitation, setContextCitation] = useState<Citation | null>(null);
  const [suggestedQuestionsByDocument, setSuggestedQuestionsByDocument] =
    useState<Record<string, string[]>>({});

  const {
    messagesBySession,
    isStreaming,
    currentStage,
    stageTimestamps,
    retrievedChunks,
    retrievedParagraphs,
    contextWindowSize,
    streamError,
    clearError,
    setContextWindowSize,
    clearContext,
    sendMessage,
  } = useChatStore(useShallow((state) => ({
    messagesBySession: state.messagesBySession,
    isStreaming: state.isStreaming,
    currentStage: state.currentStage,
    stageTimestamps: state.stageTimestamps,
    retrievedChunks: state.retrievedChunks,
    retrievedParagraphs: state.retrievedParagraphs,
    contextWindowSize: state.contextWindowSize,
    streamError: state.streamError,
    clearError: state.clearError,
    setContextWindowSize: state.setContextWindowSize,
    clearContext: state.clearContext,
    sendMessage: state.sendMessage,
  })));

  const messages = useMemo(
    () => (sessionId ? messagesBySession[sessionId] ?? [] : []),
    [messagesBySession, sessionId],
  );

  const hasSuggestedQuestionsLoaded = documentId in suggestedQuestionsByDocument;
  const suggestedQuestions = suggestedQuestionsByDocument[documentId] ?? [];
  const isSuggestionsLoading =
    Boolean(sessionId) && messages.length === 0 && !hasSuggestedQuestionsLoaded;

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

  useEffect(() => {
    if (!sessionId || messages.length > 0 || hasSuggestedQuestionsLoaded) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/suggest?docId=${encodeURIComponent(documentId)}`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return [] as string[];
        }

        const payload = (await response.json()) as unknown;
        return normalizeSuggestedQuestions(payload);
      })
      .then((questions) => {
        if (!cancelled) {
          setSuggestedQuestionsByDocument((prev) => ({
            ...prev,
            [documentId]: questions,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestedQuestionsByDocument((prev) => ({
            ...prev,
            [documentId]: [],
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, hasSuggestedQuestionsLoaded, messages.length, sessionId]);

  const effectiveSelectedCitation =
    selectedCitation && panelCitations.some((citation) => citation.id === selectedCitation.id)
      ? selectedCitation
      : null;

  const effectiveContextCitation =
    contextCitation && panelCitations.some((citation) => citation.id === contextCitation.id)
      ? contextCitation
      : null;

  const { totalRounds, activeRounds } = useMemo(() => {
    let start = 0;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "SYSTEM") {
        start = index + 1;
        break;
      }
    }

    const contextMessages = messages
      .slice(start)
      .filter((message) => message.role === "USER" || message.role === "ASSISTANT");
    const rounds = Math.ceil(contextMessages.length / 2);

    return {
      totalRounds: rounds,
      activeRounds: Math.min(rounds, contextWindowSize),
    };
  }, [contextWindowSize, messages]);

  const overviewSectionCount = (() => {
    if (!document?.structureTree) {
      return mockDocumentOverview.sectionCount;
    }

    const count = countSectionsFromTree(document.structureTree);
    return count > 0 ? count : mockDocumentOverview.sectionCount;
  })();

  const overviewSummary = getSummaryFromTree(document?.structureTree) ?? mockDocumentOverview.summary;

  const overviewDocumentName = document?.originalName ?? mockDocumentOverview.documentName;
  const overviewPageCount = document?.pageCount ?? mockDocumentOverview.pageCount;

  const submitQuery = async (query: string) => {
    await sendMessage({
      documentId,
      documentIds,
      sessionId,
      query,
    });
  };

  return (
    <div className="grid h-full min-h-[70vh] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.16)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">对话</h2>
          <StageIndicator stage={currentStage} />
        </div>

        <ScrollArea className="min-h-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <DocumentOverview
                  documentName={overviewDocumentName}
                  pageCount={overviewPageCount}
                  sectionCount={overviewSectionCount}
                  summary={overviewSummary}
                />

                {isSuggestionsLoading ? (
                  <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-sm text-[var(--foreground-dim)]">
                    正在生成推荐问题...
                  </p>
                ) : (
                  <SuggestedQuestions
                    questions={suggestedQuestions}
                    disabled={isStreaming || !sessionId}
                    onSelect={(question) => {
                      void submitQuery(question);
                    }}
                  />
                )}

                {!isSuggestionsLoading && suggestedQuestions.length === 0 && (
                  <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-sm text-[var(--foreground-dim)]">
                    向文档提问，开始智能问答吧
                  </p>
                )}
              </div>
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

            {isStreaming && currentStage && (
              <div className="animate-fade-in-up rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                <ThoughtTimeline
                  stageTimestamps={stageTimestamps}
                  currentStage={currentStage}
                  retrievedChunks={retrievedChunks}
                  retrievedParagraphs={retrievedParagraphs}
                />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {streamError && (
          <div className="flex items-center justify-between rounded-md border border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.1)] px-3 py-2 text-xs text-[#fca5a5]">
            <span>{streamError}</span>
            <Button size="sm" variant="ghost" onClick={clearError}>
              关闭
            </Button>
          </div>
        )}

        <ContextManager
          activeRounds={activeRounds}
          totalRounds={totalRounds}
          contextWindowSize={contextWindowSize}
          disabled={isStreaming || !sessionId}
          onWindowSizeChange={setContextWindowSize}
          onClearContext={() => {
            if (sessionId) {
              clearContext(sessionId);
            }
          }}
        />

        <ChatInput
          disabled={isStreaming || !sessionId}
          onSubmit={submitQuery}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <Tabs defaultValue="citations" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-6 bg-[var(--surface)] border border-[var(--border-subtle)]">
            <TabsTrigger value="citations" className="text-[10px] px-1">引用</TabsTrigger>
            <TabsTrigger value="thought" className="text-[10px] px-1">思考</TabsTrigger>
            <TabsTrigger value="mindmap" className="text-[10px] px-1">导图</TabsTrigger>
            <TabsTrigger value="retrieval" className="text-[10px] px-1">路径</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-[10px] px-1">热力</TabsTrigger>
            <TabsTrigger value="perf" className="text-[10px] px-1">性能</TabsTrigger>
          </TabsList>

          <TabsContent value="citations" className="flex-1 min-h-0 mt-2">
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
              <section className="animate-fade-in-up mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.16)]">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">上下文视图</h3>
                <p className="mt-1 text-xs text-[var(--foreground-dim)]">{effectiveContextCitation.path.join(" > ")}</p>
                <p className="mt-3 rounded-md border border-[color:rgba(234,179,8,0.16)] bg-[color:rgba(234,179,8,0.1)] px-3 py-2 text-sm text-[#fde68a]">
                  {effectiveContextCitation.text}
                </p>
              </section>
            )}
          </TabsContent>

          <TabsContent value="thought" className="flex-1 min-h-0 mt-2 overflow-auto">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">思考过程</h3>
              <ThoughtTimeline
                stageTimestamps={stageTimestamps}
                currentStage={currentStage}
                retrievedChunks={retrievedChunks}
                retrievedParagraphs={retrievedParagraphs}
              />
            </div>
          </TabsContent>

          <TabsContent value="mindmap" className="flex-1 min-h-0 mt-2">
            <div className="h-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2" style={{ minHeight: 300 }}>
              <DocumentMindmap
                tree={document?.structureTree ? (document.structureTree as import("@/types/rag").DocumentTreeNode) : mockDocumentTree}
                retrievedChunks={retrievedChunks}
              />
            </div>
          </TabsContent>

          <TabsContent value="retrieval" className="flex-1 min-h-0 mt-2">
            <div className="h-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2" style={{ minHeight: 200 }}>
              <RetrievalFlow
                currentStage={currentStage}
                isStreaming={isStreaming}
                summaryChunkCount={retrievedChunks.length || undefined}
                paragraphCount={retrievedParagraphs.length || undefined}
              />
            </div>
          </TabsContent>

          <TabsContent value="heatmap" className="flex-1 min-h-0 mt-2">
            <div className="h-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2" style={{ minHeight: 300 }}>
              <DocumentHeatmap
                paragraphs={mockParagraphs}
                retrievedChunks={retrievedChunks}
                onParagraphClick={(paraId) => {
                  const matching = panelCitations.find((c) => c.paragraph_id === paraId);
                  if (matching) {
                    setSelectedCitation(matching);
                    setContextCitation(null);
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="perf" className="flex-1 min-h-0 mt-2 overflow-auto">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <PerformanceDashboard
                stageTimestamps={stageTimestamps}
                retrievedChunks={retrievedChunks}
                retrievedParagraphs={retrievedParagraphs}
                tokenCount={useChatStore.getState().tokenCount}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
