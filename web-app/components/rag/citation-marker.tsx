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
        "mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-[border-color,background-color,color,box-shadow] duration-150",
        selected
          ? "border-[color:rgba(99,102,241,0.18)] bg-[var(--accent-subtle)] text-[var(--accent-hover)] shadow-[0_8px_18px_rgba(79,70,229,0.2)]"
          : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]",
      )}
      title={citation.path.join(" > ")}
      aria-label={`查看引用 ${citation.id}`}
    >
      {citation.id}
    </button>
  );
}
