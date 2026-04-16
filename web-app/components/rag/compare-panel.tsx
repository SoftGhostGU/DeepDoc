"use client";

import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CitationMarker } from "@/components/rag/citation-marker";
import { StageIndicator } from "@/components/rag/stage-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RagCitation } from "@/types/rag";
import type { RagStage } from "@/types/rag";

interface ComparePanelProps {
  title: string;
  answer: string;
  citations: RagCitation[];
  streaming: boolean;
  done: boolean;
  stage?: RagStage | null;
}

export function ComparePanel({ title, answer, citations, streaming, stage }: ComparePanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {stage && <StageIndicator stage={stage} />}
      </div>

      <ScrollArea className="mt-2 min-h-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
        {!answer && !streaming && (
          <p className="text-sm text-[var(--foreground-dim)]">等待提问...</p>
        )}
        {answer && (
          <div className="prose-sm text-sm text-[var(--foreground)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>
        )}
        {streaming && !answer && (
          <div className="flex items-center gap-2 text-xs text-[var(--accent)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            生成中...
          </div>
        )}
      </ScrollArea>

      {citations.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-[var(--foreground-muted)]">引用 ({citations.length})</p>
          {citations.map((citation) => (
            <div key={citation.id} className="flex items-start gap-1.5 text-xs">
              <CitationMarker citation={citation} />
              <span className="text-[var(--foreground-dim)] line-clamp-2">{citation.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
