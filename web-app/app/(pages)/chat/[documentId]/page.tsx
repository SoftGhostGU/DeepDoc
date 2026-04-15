"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { ChatWindow } from "@/components/rag/chat-window";
import { SessionSidebar } from "@/components/rag/session-sidebar";
import { useChatStore } from "@/lib/stores/chat-store";
import { useDocumentStore } from "@/lib/stores/document-store";

export default function ChatDocumentPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;

  const { documents, fetchDocuments } = useDocumentStore(
    useShallow((state) => ({
      documents: state.documents,
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

  const sessions = useMemo(
    () => sessionsByDocument[documentId] ?? [],
    [documentId, sessionsByDocument],
  );
  const activeSessionId = activeSessionIdByDocument[documentId];

  const currentDocument = useMemo(
    () => documents.find((document) => document.id === documentId),
    [documents, documentId],
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
    <section className="animate-fade-in-up flex h-full min-h-[70vh] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">问答工作区</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          文档：{currentDocument?.originalName ?? documentId}
        </p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onCreateSession={() => {
            const session = createSession(documentId, "新对话");
            setActiveSession(documentId, session.id);
          }}
          onSelectSession={(sessionId) => setActiveSession(documentId, sessionId)}
        />

        <ChatWindow documentId={documentId} sessionId={activeSessionId} />
      </div>
    </section>
  );
}
