"use client";

import { Loader2 } from "lucide-react";

import type { RagStage } from "@/types/rag";

const stageLabel: Record<RagStage, string> = {
  analyzing: "分析查询意图...",
  rewriting: "改写查询...",
  retrieving_summary: "检索摘要候选...",
  retrieving_paragraphs: "检索源段落...",
  generating: "生成回答...",
};

const stageTone: Record<RagStage, string> = {
  analyzing: "border-[color:rgba(99,102,241,0.18)] bg-[var(--accent-subtle)] text-[var(--accent-hover)]",
  rewriting: "border-[color:rgba(99,102,241,0.18)] bg-[var(--accent-subtle)] text-[var(--accent-hover)]",
  retrieving_summary: "border-[color:rgba(234,179,8,0.16)] bg-[color:rgba(234,179,8,0.1)] text-[#fde047]",
  retrieving_paragraphs: "border-[color:rgba(34,197,94,0.16)] bg-[color:rgba(34,197,94,0.1)] text-[#86efac]",
  generating: "border-[color:rgba(99,102,241,0.18)] bg-[var(--accent-subtle)] text-[var(--accent-hover)]",
};

interface StageIndicatorProps {
  stage: RagStage | null;
}

export function StageIndicator({ stage }: StageIndicatorProps) {
  if (!stage) {
    return null;
  }

  return (
    <div
      className={`animate-cascade inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-[0_10px_20px_rgba(0,0,0,0.14)] ${stageTone[stage]}`}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{stageLabel[stage]}</span>
    </div>
  );
}
