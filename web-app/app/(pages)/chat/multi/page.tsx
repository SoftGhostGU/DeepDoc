"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { ChatWindow } from "@/components/rag/chat-window";
import { SessionSidebar } from "@/components/rag/session-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/stores/chat-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { cn } from "@/lib/utils";
import { createDocumentColorMap } from "@/lib/utils/doc-colors";

export default function ChatMultiDocumentPage() {
  return (
    <Suspense
      fallback={(
        <section className="animate-fade-in-up rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--foreground-dim)]">
          正在加载多文档会话...
        </section>
      )}
    >
      <ChatMultiDocumentPageContent />
    </Suspense>
  );
}

function ChatMultiDocumentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allowSectionScroll, setAllowSectionScroll] = useState(false);

  const docsParam = searchParams.get("docs") ?? "";
  const selectedDocumentIds = useMemo(
    () =>
      Array.from(
        new Set(
          docsParam
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    [docsParam],
  );

  const primaryDocumentId = selectedDocumentIds[0] ?? "";

  const { documents, isLoading, fetchDocuments } = useDocumentStore(
    useShallow((state) => ({
      documents: state.documents,
      isLoading: state.isLoading,
      fetchDocuments: state.fetchDocuments,
    })),
  );

  const {
    sessionsByDocument,
    activeSessionIdByDocument,
    loadHistory,
    createSession,
    setActiveSession,
  } = useChatStore(useShallow((state) => ({
    sessionsByDocument: state.sessionsByDocument,
    activeSessionIdByDocument: state.activeSessionIdByDocument,
    loadHistory: state.loadHistory,
    createSession: state.createSession,
    setActiveSession: state.setActiveSession,
  })));

  const selectedDocuments = useMemo(
    () =>
      selectedDocumentIds
        .map((documentId) => documents.find((document) => document.id === documentId))
        .filter((document) => Boolean(document)),
    [documents, selectedDocumentIds],
  );

  const selectedDocumentIdSet = useMemo(
    () => new Set(selectedDocumentIds),
    [selectedDocumentIds],
  );

  const sessions = useMemo(() => {
    if (!primaryDocumentId) {
      return [];
    }

    return (sessionsByDocument[primaryDocumentId] ?? []).filter((session) => {
      const sessionDocumentIds =
        session.documentIds && session.documentIds.length > 0
          ? session.documentIds
          : [session.documentId];

      if (sessionDocumentIds.length < 2 || sessionDocumentIds.length !== selectedDocumentIds.length) {
        return false;
      }

      return sessionDocumentIds.every((documentId) => selectedDocumentIdSet.has(documentId));
    });
  }, [primaryDocumentId, selectedDocumentIdSet, selectedDocumentIds.length, sessionsByDocument]);

  const activeSessionId = activeSessionIdByDocument[primaryDocumentId];

  const documentColorMap = useMemo(
    () => createDocumentColorMap(selectedDocumentIds),
    [selectedDocumentIds],
  );

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!primaryDocumentId) {
      return;
    }

    void loadHistory(primaryDocumentId).catch(() => undefined);
  }, [loadHistory, primaryDocumentId]);

  useEffect(() => {
    if (!primaryDocumentId || selectedDocumentIds.length < 2) {
      return;
    }

    if (sessions.length > 0) {
      const hasActiveSession = sessions.some((session) => session.id === activeSessionId);
      if (!hasActiveSession && sessions[0]) {
        setActiveSession(primaryDocumentId, sessions[0].id);
      }
      return;
    }

    const newSession = createSession(primaryDocumentId, "多文档新对话", selectedDocumentIds);
    setActiveSession(primaryDocumentId, newSession.id);
  }, [
    activeSessionId,
    createSession,
    primaryDocumentId,
    selectedDocumentIds,
    selectedDocumentIds.length,
    sessions,
    setActiveSession,
  ]);

  if (selectedDocumentIds.length < 2) {
    return (
      <section className="animate-fade-in-up rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-center">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">多文档问答</h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
          请至少选择 2 份文档后再进入多文档问答。
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/documents")}>
          返回文档页
        </Button>
      </section>
    );
  }

  if (!isLoading && selectedDocuments.length !== selectedDocumentIds.length) {
    return (
      <section className="animate-fade-in-up rounded-xl border border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.1)] p-6">
        <h1 className="text-xl font-semibold text-[#fecaca]">部分文档不可用</h1>
        <p className="mt-2 text-sm text-[#fca5a5]">
          所选文档中有内容不存在或未完成加载，请返回文档页重新选择。
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/documents")}>
          返回文档页
        </Button>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "animate-fade-in-up flex min-h-0 flex-col gap-4",
        allowSectionScroll
          ? "h-auto min-h-full overflow-y-auto pb-2"
          : "h-full overflow-hidden",
      )}
    >
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">多文档问答工作区</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">已选择 {selectedDocumentIds.length} 份文档</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedDocuments.map((document) => {
            if (!document) {
              return null;
            }

            const color = documentColorMap[document.id] ?? "#94a3b8";

            return (
              <Badge
                key={document.id}
                className="gap-2 border bg-transparent"
                style={{ borderColor: color, color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {document.originalName}
              </Badge>
            );
          })}
        </div>
      </header>

      <div
        className={cn(
          "grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]",
          allowSectionScroll ? "h-auto" : "min-h-0 flex-1 overflow-hidden",
        )}
      >
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onCreateSession={() => {
            const session = createSession(primaryDocumentId, "多文档新对话", selectedDocumentIds);
            setActiveSession(primaryDocumentId, session.id);
          }}
          onSelectSession={(sessionId) => setActiveSession(primaryDocumentId, sessionId)}
        />

        <ChatWindow
          documentId={primaryDocumentId}
          documentIds={selectedDocumentIds}
          sessionId={activeSessionId}
          onCompactViewportChange={setAllowSectionScroll}
        />
      </div>
    </section>
  );
}
