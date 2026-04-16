"use client";

import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ContextManagerProps {
  activeRounds: number;
  totalRounds: number;
  contextWindowSize: number;
  disabled?: boolean;
  onWindowSizeChange: (size: number) => void;
  onClearContext: () => void;
}

export function ContextManager({
  activeRounds,
  totalRounds,
  contextWindowSize,
  disabled = false,
  onWindowSizeChange,
  onClearContext,
}: ContextManagerProps) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--foreground-muted)]">
          上下文: <span className="font-mono text-[var(--foreground)]">{activeRounds}/{totalRounds} 轮</span>
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="context-window-size" className="text-xs text-[var(--foreground-dim)]">
            窗口
          </label>
          <select
            id="context-window-size"
            value={contextWindowSize}
            disabled={disabled}
            onChange={(event) => onWindowSizeChange(Number(event.target.value))}
            className="h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {Array.from({ length: 10 }).map((_, index) => {
              const value = index + 1;
              return (
                <option key={value} value={value}>
                  {value} 轮
                </option>
              );
            })}
          </select>

          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onClearContext}
            className="h-8"
          >
            <Eraser className="h-3.5 w-3.5" />
            清除上下文
          </Button>
        </div>
      </div>
    </div>
  );
}
