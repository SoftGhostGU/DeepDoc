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
          ? "border-cyan-300/70 bg-cyan-400/22 text-cyan-50 shadow-[0_0_14px_rgba(0,212,255,0.38)]"
          : "border-slate-600 bg-[#132841] text-slate-300 hover:border-cyan-300/55 hover:text-cyan-100",
      )}
      title={citation.path.join(" > ")}
      aria-label={`查看引用 ${citation.id}`}
    >
      {citation.id}
    </button>
  );
}
