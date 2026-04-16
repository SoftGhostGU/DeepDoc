"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  PenLine,
  BrainCircuit,
  FileSearch,
} from "lucide-react";

import type { ParagraphItem, RagStage, RetrievedChunk, StageTimestamp } from "@/types/rag";
import { RAG_STAGES } from "@/types/rag";

const stageMeta: Record<RagStage, { label: string; icon: React.ElementType }> = {
  analyzing: { label: "分析查询意图", icon: BrainCircuit },
  rewriting: { label: "改写查询", icon: PenLine },
  retrieving_summary: { label: "检索摘要候选", icon: Search },
  retrieving_paragraphs: { label: "检索源段落", icon: FileSearch },
  generating: { label: "生成回答", icon: Sparkles },
};

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface ThoughtTimelineProps {
  stageTimestamps: Record<string, StageTimestamp>;
  currentStage: RagStage | null;
  retrievedChunks: RetrievedChunk[];
  retrievedParagraphs: ParagraphItem[];
}

export function ThoughtTimeline({
  stageTimestamps,
  currentStage,
  retrievedChunks,
  retrievedParagraphs,
}: ThoughtTimelineProps) {
  return (
    <div className="space-y-0">
      {RAG_STAGES.map((stage, idx) => (
        <TimelineStage
          key={stage}
          stage={stage}
          stageTimestamps={stageTimestamps}
          currentStage={currentStage}
          retrievedChunks={retrievedChunks}
          retrievedParagraphs={retrievedParagraphs}
          isLast={idx === RAG_STAGES.length - 1}
        />
      ))}
    </div>
  );
}

function TimelineStage({
  stage,
  stageTimestamps,
  currentStage,
  retrievedChunks,
  retrievedParagraphs,
  isLast,
}: {
  stage: RagStage;
  stageTimestamps: Record<string, StageTimestamp>;
  currentStage: RagStage | null;
  retrievedChunks: RetrievedChunk[];
  retrievedParagraphs: ParagraphItem[];
  isLast: boolean;
}) {
  const ts = stageTimestamps[stage];
  const isActive = currentStage === stage;
  const isCompleted = ts?.end != null;
  const isPending = !isActive && !isCompleted;
  const meta = stageMeta[stage];
  const Icon = meta.icon;
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isActive || !ts?.start) return;
    const interval = setInterval(() => setElapsed(Date.now() - ts.start), 100);
    return () => clearInterval(interval);
  }, [isActive, ts?.start]);

  const duration = isCompleted && ts?.start && ts?.end ? ts.end - ts.start : null;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-300 ${
            isActive
              ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-hover)] animate-pulse-glow"
              : isCompleted
                ? "border-[color:rgba(34,197,94,0.4)] bg-[color:rgba(34,197,94,0.1)] text-[#86efac]"
                : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground-dim)]"
          }`}
        >
          {isActive ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 transition-colors duration-300 ${
              isCompleted ? "bg-[color:rgba(34,197,94,0.3)]" : "bg-[var(--border-subtle)]"
            }`}
          />
        )}
      </div>

      <div className={`flex-1 pb-3 ${isLast ? "" : ""}`}>
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => {
            if (isCompleted && (stage === "retrieving_summary" || stage === "retrieving_paragraphs")) {
              setExpanded(!expanded);
            }
          }}
        >
          <span
            className={`text-xs font-medium transition-colors duration-200 ${
              isActive
                ? "text-[var(--accent-hover)]"
                : isCompleted
                  ? "text-[#86efac]"
                  : "text-[var(--foreground-dim)]"
            }`}
          >
            {meta.label}
          </span>

          {isActive && (
            <span className="text-[10px] font-mono text-[var(--accent)]">{formatElapsed(elapsed)}</span>
          )}
          {isCompleted && duration != null && (
            <span className="text-[10px] font-mono text-[var(--foreground-dim)]">{formatElapsed(duration)}</span>
          )}
          {isCompleted && (stage === "retrieving_summary" || stage === "retrieving_paragraphs") && (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-[var(--foreground-dim)]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[var(--foreground-dim)]" />
            )
          )}
        </button>

        {isPending && (
          <p className="mt-0.5 text-[10px] text-[var(--foreground-dim)]">等待中...</p>
        )}

        {expanded && isCompleted && stage === "retrieving_summary" && (
          <div className="mt-1.5 space-y-1 animate-fade-in-up">
            {retrievedChunks.length > 0 ? (
              retrievedChunks.map((chunk, i) => (
                <div
                  key={chunk.id}
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1.5 text-[10px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--foreground-muted)]">#{i + 1}</span>
                    <span className="font-mono text-[var(--accent)]">
                      {(chunk.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[var(--foreground-dim)] line-clamp-2">{chunk.text}</p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[var(--foreground-dim)]">无摘要检索结果</p>
            )}
          </div>
        )}

        {expanded && isCompleted && stage === "retrieving_paragraphs" && (
          <div className="mt-1.5 space-y-1 animate-fade-in-up">
            {retrievedParagraphs.length > 0 ? (
              retrievedParagraphs.map((para) => (
                <div
                  key={para.id}
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1.5 text-[10px]"
                >
                  <div className="text-[var(--foreground-muted)]">段落 {para.index}</div>
                  <p className="mt-0.5 text-[var(--foreground-dim)] line-clamp-2">{para.text}</p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[var(--foreground-dim)]">无段落检索结果</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
