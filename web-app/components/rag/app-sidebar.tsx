"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Library, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentList } from "@/components/rag/document-list";
import { DocumentUpload } from "@/components/rag/document-upload";
import { useDocumentStore } from "@/lib/stores/document-store";

export function AppSidebar() {
  const { documents, fetchDocuments, addDocument, removeDocument, isLoading } = useDocumentStore();

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  return (
    <aside className="flex h-full w-full max-w-xs flex-col border-r border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/documents" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Library className="h-4 w-4" />
          Documents
        </Link>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => void fetchDocuments()}
          disabled={isLoading}
          aria-label="Refresh documents"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DocumentUpload compact onUploaded={addDocument} />

      <ScrollArea className="mt-4 flex-1 pr-1">
        <DocumentList documents={documents} compact onDeleted={removeDocument} />
      </ScrollArea>
    </aside>
  );
}
