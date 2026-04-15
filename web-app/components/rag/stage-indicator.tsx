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
  analyzing: "border-cyan-300/50 bg-cyan-400/12 text-cyan-100",
  rewriting: "border-sky-300/45 bg-sky-400/12 text-sky-100",
  retrieving_summary: "border-amber-300/50 bg-amber-400/15 text-amber-100",
  retrieving_paragraphs: "border-emerald-300/45 bg-emerald-400/15 text-emerald-100",
  generating: "border-violet-300/45 bg-violet-400/15 text-violet-100",
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
      className={`animate-cascade inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-[0_0_18px_rgba(0,212,255,0.18)] ${stageTone[stage]}`}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{stageLabel[stage]}</span>
    </div>
  );
}
