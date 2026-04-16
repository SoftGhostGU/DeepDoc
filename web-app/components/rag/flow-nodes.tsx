"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export type SectionNodeData = {
  label: string;
  summary?: string;
  level: number;
  hasChildren: boolean;
  collapsed: boolean;
  highlighted: boolean;
};

export type StageNodeData = {
  label: string;
  sublabel?: string;
  status: "inactive" | "active" | "completed";
  chunkCount?: number;
};

export function SectionNode({ data }: NodeProps) {
  const d = data as unknown as SectionNodeData;
  const levelColors = [
    "border-[var(--accent)] bg-[var(--accent-subtle)]",
    "border-[var(--border)] bg-[var(--surface-raised)]",
    "border-[var(--border-subtle)] bg-[var(--surface)]",
  ];
  const borderColor = d.highlighted
    ? "border-[var(--accent)] shadow-[0_0_12px_rgba(99,102,241,0.3)]"
    : levelColors[d.level] ?? levelColors[2];

  return (
    <div
      className={`min-w-[120px] max-w-[200px] rounded-lg border px-3 py-2 text-xs transition-all duration-300 ${borderColor}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--border)] !w-1.5 !h-1.5 !border-0" />
      <div className="font-semibold text-[var(--foreground)] truncate">{d.label}</div>
      {d.summary && (
        <div className="mt-0.5 text-[10px] text-[var(--foreground-dim)] line-clamp-2">{d.summary}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--border)] !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

export const SectionNodeMemo = memo(SectionNode);

export function StageNode({ data }: NodeProps) {
  const d = data as unknown as StageNodeData;

  const statusStyles = {
    inactive: "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground-dim)]",
    active: "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-hover)] animate-pulse-glow",
    completed: "border-[color:rgba(34,197,94,0.4)] bg-[color:rgba(34,197,94,0.1)] text-[#86efac]",
  };

  return (
    <div
      className={`min-w-[110px] rounded-lg border px-3 py-2 text-center text-xs transition-all duration-500 ${statusStyles[d.status]}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--border)] !w-1.5 !h-1.5 !border-0" />
      <div className="font-semibold">{d.label}</div>
      {d.sublabel && (
        <div className="mt-0.5 text-[10px] opacity-70">{d.sublabel}</div>
      )}
      {d.chunkCount != null && d.status !== "inactive" && (
        <div className="mt-1 rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
          {d.chunkCount} 条结果
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-[var(--border)] !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

export const StageNodeMemo = memo(StageNode);
