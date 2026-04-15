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
    <aside className="flex w-full flex-col border-b border-slate-700/70 bg-[#0b1a2f]/85 p-4 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)] backdrop-blur-sm md:h-full md:max-w-xs md:border-r md:border-b-0 md:shadow-[inset_-1px_0_0_rgba(148,163,184,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/documents"
          className={cn(
            "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-slate-200 transition",
            isDocumentsActive && "text-cyan-100",
          )}
        >
          <span
            className={cn(
              "absolute left-0 h-5 w-0.5 rounded-full bg-transparent transition",
              isDocumentsActive && "bg-cyan-300 shadow-[0_0_14px_rgba(0,212,255,0.7)]",
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
