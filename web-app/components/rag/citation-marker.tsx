"use client";

import { cn } from "@/lib/utils";
import type { Citation } from "@/types";

interface CitationMarkerProps {
  citation: Citation;
  selected?: boolean;
  onClick?: (citation: Citation) => void;
}

export function CitationMarker({ citation, selected = false, onClick }: CitationMarkerProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      className={cn(
        "mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-[11px] font-semibold transition",
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-500",
      )}
      title={citation.path.join(" > ")}
      aria-label={`Open citation ${citation.id}`}
    >
      {citation.id}
    </button>
  );
}
