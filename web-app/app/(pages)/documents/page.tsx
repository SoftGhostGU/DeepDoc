"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { EmptyState } from "@/components/rag/empty-state";
import { DocumentList } from "@/components/rag/document-list";
import { DocumentUpload } from "@/components/rag/document-upload";
import { MultiDocSelector } from "@/components/rag/multi-doc-selector";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDocumentStore } from "@/lib/stores/document-store";

export default function DocumentsPage() {
  const router = useRouter();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const { documents, isLoading, error, fetchDocuments, addDocument, removeDocument } =
    useDocumentStore(useShallow((state) => ({
      documents: state.documents,
      isLoading: state.isLoading,
      error: state.error,
      fetchDocuments: state.fetchDocuments,
      addDocument: state.addDocument,
      removeDocument: state.removeDocument,
    })));

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const indexedDocuments = useMemo(
    () => documents.filter((document) => document.status === "INDEXED"),
    [documents],
  );
  const disableMultiDocEntry = indexedDocuments.length < 2;

  return (
    <section className="animate-fade-in-up space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">文档管理</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            上传源文件，打开已索引文档进入问答工作区
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disableMultiDocEntry}
                  onClick={() => setSelectorOpen(true)}
                >
                  多文档问答
                </Button>
              </span>
            </TooltipTrigger>

            {disableMultiDocEntry && (
              <TooltipContent>至少需要 2 份已索引文档才能开始多文档问答</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </header>

      <DocumentUpload onUploaded={addDocument} />

      {error && (
        <p className="rounded-md border border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.1)] px-3 py-2 text-sm text-[#fca5a5]">
          {error}
        </p>
      )}

      {isLoading && documents.length === 0 ? (
        <p className="font-mono text-sm text-[var(--foreground-dim)]">加载中...</p>
      ) : documents.length === 0 ? (
        <EmptyState />
      ) : (
        <DocumentList documents={documents} onDeleted={removeDocument} />
      )}

      <MultiDocSelector
        open={selectorOpen}
        documents={indexedDocuments}
        onOpenChange={setSelectorOpen}
        onConfirm={(documentIds) => {
          setSelectorOpen(false);
          const docs = documentIds.join(",");
          router.push(`/chat/multi?docs=${encodeURIComponent(docs)}`);
        }}
      />
    </section>
  );
}
