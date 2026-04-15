"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { EmptyState } from "@/components/rag/empty-state";
import { DocumentList } from "@/components/rag/document-list";
import { DocumentUpload } from "@/components/rag/document-upload";
import { useDocumentStore } from "@/lib/stores/document-store";

export default function DocumentsPage() {
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

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">文档管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          上传源文件，打开已索引文档进入问答工作区
        </p>
      </header>

      <DocumentUpload onUploaded={addDocument} />

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {isLoading && documents.length === 0 ? (
        <p className="text-sm text-slate-500">加载中...</p>
      ) : documents.length === 0 ? (
        <EmptyState />
      ) : (
        <DocumentList documents={documents} onDeleted={removeDocument} />
      )}
    </section>
  );
}
