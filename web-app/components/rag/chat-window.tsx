"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Expand, FileText } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { ChatInput } from "@/components/rag/chat-input";
import { ChatMessage } from "@/components/rag/chat-message";
import { CitationPanel } from "@/components/rag/citation-panel";
import { ContextManager } from "@/components/rag/context-manager";
import { DocumentHeatmap } from "@/components/rag/document-heatmap";
import { DocumentMindmap } from "@/components/rag/document-mindmap";
import { DocumentOverview } from "@/components/rag/document-overview";
import { PanelExpandDialog } from "@/components/rag/panel-expand-dialog";
import { PerformanceDashboard } from "@/components/rag/performance-dashboard";
import { RetrievalFlow } from "@/components/rag/retrieval-flow";
import { StageIndicator } from "@/components/rag/stage-indicator";
import { SuggestedQuestions } from "@/components/rag/suggested-questions";
import { ThoughtTimeline } from "@/components/rag/thought-timeline";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockDocumentOverview } from "@/lib/mock/data";
import { useChatStore } from "@/lib/stores/chat-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { buildPdfPageHref, formatCitationPage, isSuspiciousExtractedText } from "@/lib/utils/citation-preview";
import { cn } from "@/lib/utils";
import type { Citation, Document } from "@/types";
import type { DocumentTreeNode } from "@/types/rag";

interface ChatWindowProps {
  documentId: string;
  documentIds?: string[];
  sessionId?: string;
  document?: Document;
  onCompactViewportChange?: (isCompact: boolean) => void;
}

type SidePanelTab = "citations" | "thought" | "mindmap" | "retrieval" | "heatmap" | "perf";

const SIDE_PANEL_TAB_META: Record<SidePanelTab, { label: string; expandTitle: string }> = {
  citations: { label: "引用", expandTitle: "引用来源" },
  thought: { label: "思考", expandTitle: "思考过程" },
  mindmap: { label: "导图", expandTitle: "文档导图" },
  retrieval: { label: "路径", expandTitle: "检索路径" },
  heatmap: { label: "热力", expandTitle: "相关度热力图" },
  perf: { label: "性能", expandTitle: "性能面板" },
};

function collectSectionTitles(node: unknown, map: Map<string, string>) {
  if (!node || typeof node !== "object") {
    return;
  }

  const current = node as {
    id?: unknown;
    title?: unknown;
    children?: unknown;
  };

  if (typeof current.id === "string" && typeof current.title === "string") {
    map.set(current.id, current.title);
  }

  if (!Array.isArray(current.children)) {
    return;
  }

  for (const child of current.children) {
    collectSectionTitles(child, map);
  }
}

function buildSectionTitleMap(tree: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!tree || typeof tree !== "object") {
    return map;
  }

  const root = (tree as { root?: unknown }).root ?? tree;
  collectSectionTitles(root, map);
  return map;
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

export function ChatWindow({
  documentId,
  documentIds,
  sessionId,
  document,
  onCompactViewportChange,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<SidePanelTab>("citations");
  const [expandedTab, setExpandedTab] = useState<SidePanelTab | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
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

  const { documents } = useDocumentStore(
    useShallow((state) => ({
      documents: state.documents,
    })),
  );

  const messages = useMemo(
    () => (sessionId ? messagesBySession[sessionId] ?? [] : []),
    [messagesBySession, sessionId],
  );

  const hasFinished = useMemo(() => {
    if (isStreaming || currentStage !== null) {
      return false;
    }

    const lastNonSystemMessage = [...messages]
      .reverse()
      .find((message) => message.role !== "SYSTEM");

    return Boolean(
      lastNonSystemMessage &&
        lastNonSystemMessage.role === "ASSISTANT" &&
        lastNonSystemMessage.content.trim().length > 0,
    );
  }, [currentStage, isStreaming, messages]);

  const sectionTitleMap = useMemo(
    () => buildSectionTitleMap(document?.structureTree),
    [document?.structureTree],
  );

  const hasQuery = useMemo(
    () => messages.some((message) => message.role === "USER"),
    [messages],
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
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-height: 600px)");
    const updateCompactViewport = () => {
      const isCompact = mediaQuery.matches;
      setIsCompactViewport(isCompact);
      onCompactViewportChange?.(isCompact);
    };

    updateCompactViewport();
    mediaQuery.addEventListener("change", updateCompactViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactViewport);
      onCompactViewportChange?.(false);
    };
  }, [onCompactViewportChange]);

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
  const primaryDocument = useMemo(
    () =>
      document ??
      documents.find(
        (candidate) =>
          candidate.id === documentId || candidate.ragDocumentId === documentId,
      ) ??
      null,
    [document, documentId, documents],
  );

  const resolveCitationDocument = (citation: Citation | null) => {
    if (citation?.documentId) {
      const byId = documents.find(
        (candidate) =>
          candidate.id === citation.documentId || candidate.ragDocumentId === citation.documentId,
      );
      if (byId) {
        return byId;
      }
    }

    if (citation?.documentName) {
      const byName = documents.find(
        (candidate) =>
          candidate.originalName === citation.documentName ||
          candidate.filename === citation.documentName,
      );
      if (byName) {
        return byName;
      }
    }

    return primaryDocument;
  };

  const getCitationPdfHref = (citation: Citation) => {
    const citationDocument = resolveCitationDocument(citation);
    if (citationDocument?.mimeType !== "application/pdf") {
      return null;
    }

    return buildPdfPageHref(citationDocument.filename, citation.page);
  };

  const submitQuery = async (query: string) => {
    await sendMessage({
      documentId,
      documentIds,
      sessionId,
      query,
    });
  };

  const activeTabMeta = SIDE_PANEL_TAB_META[activeTab];

  const renderTabPanel = (tab: SidePanelTab) => {
    switch (tab) {
      case "citations":
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex-1 min-h-0">
              <CitationPanel
                citations={panelCitations}
                selectedId={effectiveSelectedCitation?.id}
                getPdfHref={getCitationPdfHref}
                onSelect={(citation) => {
                  setSelectedCitation(citation);
                  setContextCitation(null);
                }}
                onViewContext={(citation) => {
                  setSelectedCitation(citation);
                  setContextCitation(citation);
                }}
              />
            </div>

            {effectiveContextCitation && (
              <section className="animate-fade-in-up shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.16)]">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">上下文视图</h3>
                <p className="mt-1 text-xs text-[var(--foreground-dim)]">
                  {effectiveContextCitation.path.join(" > ")}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {formatCitationPage(effectiveContextCitation.page) && (
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--foreground-muted)]">
                      {formatCitationPage(effectiveContextCitation.page)}
                    </span>
                  )}

                  {getCitationPdfHref(effectiveContextCitation) && (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={getCitationPdfHref(effectiveContextCitation) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {formatCitationPage(effectiveContextCitation.page)
                          ? `打开原 PDF ${formatCitationPage(effectiveContextCitation.page)}`
                          : "打开原 PDF"}
                      </a>
                    </Button>
                  )}
                </div>

                {isSuspiciousExtractedText(effectiveContextCitation.text) ? (
                  <div className="mt-3 rounded-md border border-[color:rgba(234,179,8,0.18)] bg-[color:rgba(234,179,8,0.1)] px-3 py-2 text-sm text-[#fde68a]">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        文本提取可能异常
                        {formatCitationPage(effectiveContextCitation.page)
                          ? `，建议查看原 PDF 的${formatCitationPage(effectiveContextCitation.page)}。`
                          : "，建议回到原 PDF 核对。"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-[color:rgba(234,179,8,0.16)] bg-[color:rgba(234,179,8,0.1)] px-3 py-2 text-sm text-[#fde68a]">
                    {effectiveContextCitation.text}
                  </p>
                )}
              </section>
            )}
          </div>
        );
      case "thought":
        return (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
            <h3 className="mb-3 shrink-0 text-sm font-semibold text-[var(--foreground)]">思考过程</h3>
            <ScrollArea className="h-full min-h-0 flex-1 pr-2">
              <ThoughtTimeline
                stageTimestamps={stageTimestamps}
                currentStage={currentStage}
                retrievedChunks={retrievedChunks}
                retrievedParagraphs={retrievedParagraphs}
              />
            </ScrollArea>
          </div>
        );
      case "mindmap":
        return (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2">
            <div className="min-h-0 flex-1" style={{ minHeight: 300 }}>
              <DocumentMindmap
                tree={(document?.structureTree ?? null) as DocumentTreeNode | null}
                retrievedChunks={retrievedChunks}
              />
            </div>
          </div>
        );
      case "retrieval":
        return (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2">
            <div className="min-h-0 flex-1" style={{ minHeight: 200 }}>
              <RetrievalFlow
                currentStage={currentStage}
                isStreaming={isStreaming}
                hasFinished={hasFinished}
                summaryChunkCount={retrievedChunks.length || undefined}
                paragraphCount={retrievedParagraphs.length || undefined}
              />
            </div>
          </div>
        );
      case "heatmap":
        return (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2">
            <div className="min-h-0 flex-1" style={{ minHeight: 300 }}>
              <DocumentHeatmap
                retrievedParagraphs={retrievedParagraphs}
                sectionTitleMap={sectionTitleMap}
                hasQuery={hasQuery}
                onParagraphClick={(paraId) => {
                  const matching = panelCitations.find((citation) => citation.paragraph_id === paraId);
                  if (matching) {
                    setSelectedCitation(matching);
                    setContextCitation(null);
                  }
                }}
              />
            </div>
          </div>
        );
      case "perf":
        return (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
            <PerformanceDashboard
              stageTimestamps={stageTimestamps}
              retrievedChunks={retrievedChunks}
              retrievedParagraphs={retrievedParagraphs}
              tokenCount={useChatStore.getState().tokenCount}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "grid h-full min-h-0 max-h-full gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]",
        isCompactViewport && "h-auto min-h-[70vh]",
      )}
    >
      <div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.16)]">
        <div className="shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">对话</h2>
          <StageIndicator stage={currentStage} />
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
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
        </div>

        {streamError && (
          <div className="shrink-0 flex items-center justify-between rounded-md border border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.1)] px-3 py-2 text-xs text-[#fca5a5]">
            <span>{streamError}</span>
            <Button size="sm" variant="ghost" onClick={clearError}>
              关闭
            </Button>
          </div>
        )}

        <div className="shrink-0">
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
        </div>

        <div className="shrink-0">
          <ChatInput disabled={isStreaming || !sessionId} onSubmit={submitQuery} />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SidePanelTab)}
          className="flex h-full min-h-0 flex-col"
        >
          <div className="shrink-0 flex items-center gap-2">
            <TabsList className="grid h-auto flex-1 grid-cols-6 border border-[var(--border-subtle)] bg-[var(--surface)]">
              <TabsTrigger value="citations" className="px-1 text-[10px]">引用</TabsTrigger>
              <TabsTrigger value="thought" className="px-1 text-[10px]">思考</TabsTrigger>
              <TabsTrigger value="mindmap" className="px-1 text-[10px]">导图</TabsTrigger>
              <TabsTrigger value="retrieval" className="px-1 text-[10px]">路径</TabsTrigger>
              <TabsTrigger value="heatmap" className="px-1 text-[10px]">热力</TabsTrigger>
              <TabsTrigger value="perf" className="px-1 text-[10px]">性能</TabsTrigger>
            </TabsList>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 border border-[var(--border-subtle)] bg-[var(--surface)]"
              onClick={() => setExpandedTab(activeTab)}
              aria-label={`放大查看${activeTabMeta.expandTitle}`}
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>

          <TabsContent value="citations" className="mt-2 flex flex-1 min-h-0 flex-col">
            {renderTabPanel("citations")}
          </TabsContent>
          <TabsContent value="thought" className="mt-2 flex flex-1 min-h-0 flex-col">
            {renderTabPanel("thought")}
          </TabsContent>
          <TabsContent value="mindmap" className="mt-2 flex flex-1 min-h-0 flex-col">
            {renderTabPanel("mindmap")}
          </TabsContent>
          <TabsContent value="retrieval" className="mt-2 flex flex-1 min-h-0 flex-col">
            {renderTabPanel("retrieval")}
          </TabsContent>
          <TabsContent value="heatmap" className="mt-2 flex flex-1 min-h-0 flex-col">
            {renderTabPanel("heatmap")}
          </TabsContent>
          <TabsContent value="perf" className="mt-2 flex flex-1 min-h-0 flex-col">
            {renderTabPanel("perf")}
          </TabsContent>
        </Tabs>

        <PanelExpandDialog
          open={expandedTab === activeTab}
          onOpenChange={(open) => setExpandedTab(open ? activeTab : null)}
          title={activeTabMeta.expandTitle}
        >
          <div key={activeTab} className="flex h-full min-h-0 flex-col">
            {renderTabPanel(activeTab)}
          </div>
        </PanelExpandDialog>
      </div>
    </div>
  );
}
