"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { CitationMarker } from "@/components/rag/citation-marker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createDocumentColorMap, getCitationDocumentKey } from "@/lib/utils/doc-colors";
import type { Citation } from "@/types";

interface CitationSummaryFooterProps {
  messageId: string;
  citations: Citation[];
  selectedCitationId?: number;
  onCitationClick?: (messageId: string, citation: Citation) => void;
}

export function CitationSummaryFooter({
  messageId,
  citations,
  selectedCitationId,
  onCitationClick,
}: CitationSummaryFooterProps) {
  const [open, setOpen] = useState(false);

  const documentEntries = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; count: number }>();

    for (const citation of citations) {
      const key = getCitationDocumentKey(citation);
      const label =
        citation.documentName?.trim() || citation.documentId?.trim() || "未命名文档";
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { key, label, count: 1 });
      } else {
        existing.count += 1;
      }
    }

    return Array.from(grouped.values());
  }, [citations]);

  const documentColorMap = useMemo(
    () => createDocumentColorMap(documentEntries.map((entry) => entry.key)),
    [documentEntries],
  );
  const isMultiDocument = documentEntries.length > 1;

  if (!citations.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] p-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-between px-2 py-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-2">
          <span>
            {isMultiDocument
              ? `基于 ${citations.length} 个来源，来自 ${documentEntries.length} 份文档`
              : `基于 ${citations.length} 个来源`}
          </span>
          {isMultiDocument && (
            <span className="flex items-center gap-1">
              {documentEntries.map((entry) => (
                <span
                  key={`doc-dot-${entry.key}`}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: documentColorMap[entry.key] ?? "#94a3b8" }}
                  title={`${entry.label} (${entry.count})`}
                  aria-hidden="true"
                />
              ))}
            </span>
          )}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1 px-1 pb-1">
          {citations.map((citation) => (
            <CitationMarker
              key={citation.id}
              citation={citation}
              selected={selectedCitationId === citation.id}
              documentColor={documentColorMap[getCitationDocumentKey(citation)]}
              showDocumentDot={isMultiDocument}
              onClick={(selected) => onCitationClick?.(messageId, selected)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
