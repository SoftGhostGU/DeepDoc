"use client";

import { getCredibilityColor } from "@/lib/utils/credibility";

interface CredibilityBarProps {
  score: number;
}

export function CredibilityBar({ score }: CredibilityBarProps) {
  const safeScore = Math.min(Math.max(score, 0), 1);
  const percentage = Math.round(safeScore * 100);
  const color = getCredibilityColor(safeScore);

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-mono text-[11px] text-[var(--foreground-muted)]">{percentage}%</span>
    </div>
  );
}
