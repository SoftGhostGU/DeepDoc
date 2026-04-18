"use client";

import { cn } from "@/lib/utils";
import { getCredibilityColor, getCredibilityColorAlpha } from "@/lib/utils/credibility";
import type { Citation } from "@/types";

interface CitationMarkerProps {
  citation: Citation;
  selected?: boolean;
  documentColor?: string;
  showDocumentDot?: boolean;
  onClick?: (citation: Citation) => void;
}

export function CitationMarker({
  citation,
  selected = false,
  documentColor,
  showDocumentDot,
  onClick,
}: CitationMarkerProps) {
  const baseColor = getCredibilityColor(citation.score);
  const tint = getCredibilityColorAlpha(citation.score, selected ? 0.24 : 0.14);
  const glow = getCredibilityColorAlpha(citation.score, selected ? 0.28 : 0.18);
  const hasDocumentInfo = Boolean(citation.documentId || citation.documentName);
  const shouldShowDocumentDot = showDocumentDot ?? hasDocumentInfo;

  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      className={cn(
        "mx-0.5 inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-full border px-1.5 font-mono text-[11px] font-semibold transition-[border-color,background-color,color,box-shadow] duration-150",
        selected
          ? "text-white"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
      )}
      style={{
        borderColor: baseColor,
        backgroundColor: tint,
        boxShadow: selected ? `0 8px 18px ${glow}` : "none",
      }}
      title={
        citation.documentName
          ? `${citation.documentName} · ${citation.path.join(" > ")}${citation.page ? ` · 第 ${citation.page} 页` : ""}`
          : `${citation.path.join(" > ")}${citation.page ? ` · 第 ${citation.page} 页` : ""}`
      }
      aria-label={`查看引用 ${citation.id}`}
    >
      <span>{citation.id}</span>
      {shouldShowDocumentDot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: documentColor ?? "#94a3b8" }}
        />
      )}
    </button>
  );
}
