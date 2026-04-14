"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { CitationMarker } from "@/components/rag/citation-marker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types";

interface CitationSummaryFooterProps {
  citations: Citation[];
  selectedCitationId?: number;
  onCitationClick?: (citation: Citation) => void;
}

export function CitationSummaryFooter({
  citations,
  selectedCitationId,
  onCitationClick,
}: CitationSummaryFooterProps) {
  const [open, setOpen] = useState(false);

  if (!citations.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-between px-2 py-1 text-xs"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Based on {citations.length} sources</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1 px-1 pb-1">
          {citations.map((citation) => (
            <CitationMarker
              key={citation.id}
              citation={citation}
              selected={selectedCitationId === citation.id}
              onClick={onCitationClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
