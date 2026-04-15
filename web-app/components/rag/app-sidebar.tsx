"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentList } from "@/components/rag/document-list";
import { DocumentUpload } from "@/components/rag/document-upload";
import { cn } from "@/lib/utils";
import { useDocumentStore } from "@/lib/stores/document-store";

export function AppSidebar() {
  const pathname = usePathname();
  const { documents, fetchDocuments, addDocument, removeDocument, isLoading } = useDocumentStore();
  const isDocumentsActive = pathname.startsWith("/documents");

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  return (
    <aside className="flex w-full flex-col border-b border-[var(--border-subtle)] bg-[color:rgba(17,17,19,0.94)] p-4 backdrop-blur-sm md:h-full md:max-w-xs md:border-r md:border-b-0">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/documents"
          className={cn(
            "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-[var(--foreground-muted)] transition",
            isDocumentsActive && "bg-[var(--accent-subtle)] text-[var(--accent-hover)]",
          )}
        >
          <span
            className={cn(
              "absolute left-0 h-5 w-0.5 rounded-full bg-transparent transition",
              isDocumentsActive && "bg-[var(--accent)]",
            )}
          />
          <Library className="h-4 w-4" />
          文档库
        </Link>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => void fetchDocuments()}
          disabled={isLoading}
          aria-label="刷新文档列表"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DocumentUpload compact onUploaded={addDocument} />

      <ScrollArea className="mt-4 max-h-[42vh] flex-1 pr-1 md:max-h-none">
        <DocumentList documents={documents} compact onDeleted={removeDocument} />
      </ScrollArea>
    </aside>
  );
}
