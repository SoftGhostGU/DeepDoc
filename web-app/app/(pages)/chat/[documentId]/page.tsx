"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { ChatWindow } from "@/components/rag/chat-window";
import { ExportConversationButton } from "@/components/rag/export-conversation-button";
import { SessionSidebar } from "@/components/rag/session-sidebar";
import { useChatStore } from "@/lib/stores/chat-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { cn } from "@/lib/utils";

export default function ChatDocumentPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const [allowSectionScroll, setAllowSectionScroll] = useState(false);

  const { documents, fetchDocuments } = useDocumentStore(
    useShallow((state) => ({
      documents: state.documents,
      fetchDocuments: state.fetchDocuments,
    })),
  );

  const {
    sessionsByDocument,
    messagesBySession,
    activeSessionIdByDocument,
    loadHistory,
    createSession,
    setActiveSession,
  } = useChatStore(useShallow((state) => ({
    sessionsByDocument: state.sessionsByDocument,
    messagesBySession: state.messagesBySession,
    activeSessionIdByDocument: state.activeSessionIdByDocument,
    loadHistory: state.loadHistory,
    createSession: state.createSession,
    setActiveSession: state.setActiveSession,
  })));

  const sessions = useMemo(
    () => sessionsByDocument[documentId] ?? [],
    [documentId, sessionsByDocument],
  );
  const activeSessionId = activeSessionIdByDocument[documentId];

  const currentDocument = useMemo(
    () => documents.find((document) => document.id === documentId),
    [documents, documentId],
  );

  const activeMessages = useMemo(
    () => (activeSessionId ? messagesBySession[activeSessionId] ?? [] : []),
    [activeSessionId, messagesBySession],
  );

  const activeSessionTitle = useMemo(
    () => sessions.find((session) => session.id === activeSessionId)?.title ?? "新对话",
    [activeSessionId, sessions],
  );

  useEffect(() => {
    void fetchDocuments();
    void loadHistory(documentId).catch(() => undefined);
  }, [documentId, fetchDocuments, loadHistory]);

  useEffect(() => {
    if (sessions.length > 0) {
      if (!activeSessionId) {
        setActiveSession(documentId, sessions[0].id);
      }
      return;
    }

    const newSession = createSession(documentId, "新对话");
    setActiveSession(documentId, newSession.id);
  }, [activeSessionId, createSession, documentId, sessions, setActiveSession]);

  return (
    <section
      className={cn(
        "animate-fade-in-up flex min-h-0 flex-col gap-4",
        allowSectionScroll
          ? "h-auto min-h-full overflow-y-auto pb-2"
          : "h-full overflow-hidden",
      )}
    >
      <header className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">问答工作区</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            文档：{currentDocument?.originalName ?? documentId}
          </p>
        </div>

        <ExportConversationButton
          messages={activeMessages}
          documentName={currentDocument?.originalName ?? documentId}
          sessionTitle={activeSessionTitle}
        />
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
            const session = createSession(documentId, "新对话");
            setActiveSession(documentId, session.id);
          }}
          onSelectSession={(sessionId) => setActiveSession(documentId, sessionId)}
        />

        <ChatWindow
          documentId={documentId}
          sessionId={activeSessionId}
          document={currentDocument}
          onCompactViewportChange={setAllowSectionScroll}
        />
      </div>
    </section>
  );
}
