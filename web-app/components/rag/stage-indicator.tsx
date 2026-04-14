"use client";

import { Loader2 } from "lucide-react";

import type { RagStage } from "@/types/rag";

const stageLabel: Record<RagStage, string> = {
  analyzing: "Analyzing query...",
  rewriting: "Rewriting query...",
  retrieving_summary: "Retrieving summary candidates...",
  retrieving_paragraphs: "Retrieving source paragraphs...",
  generating: "Generating answer...",
};

interface StageIndicatorProps {
  stage: RagStage | null;
}

export function StageIndicator({ stage }: StageIndicatorProps) {
  if (!stage) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{stageLabel[stage]}</span>
    </div>
  );
}
