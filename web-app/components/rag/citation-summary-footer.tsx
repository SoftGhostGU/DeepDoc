"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { CitationMarker } from "@/components/rag/citation-marker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        <span>基于 {citations.length} 个来源</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1 px-1 pb-1">
          {citations.map((citation) => (
            <CitationMarker
              key={citation.id}
              citation={citation}
              selected={selectedCitationId === citation.id}
              onClick={(selected) => onCitationClick?.(messageId, selected)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
