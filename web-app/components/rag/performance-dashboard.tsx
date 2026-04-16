"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import type { ParagraphItem, RagStage, RetrievedChunk, StageTimestamp } from "@/types/rag";
import { RAG_STAGES } from "@/types/rag";

const STAGE_LABELS: Record<RagStage, string> = {
  analyzing: "意图分析",
  rewriting: "查询改写",
  retrieving_summary: "摘要检索",
  retrieving_paragraphs: "段落精排",
  generating: "生成回答",
};

interface PerformanceDashboardProps {
  stageTimestamps: Record<string, StageTimestamp>;
  retrievedChunks: RetrievedChunk[];
  retrievedParagraphs: ParagraphItem[];
  tokenCount: number;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function PerformanceDashboard({
  stageTimestamps,
  retrievedChunks,
  retrievedParagraphs,
  tokenCount,
}: PerformanceDashboardProps) {
  const stageDurations = useMemo(() => {
    const result: { stage: RagStage; label: string; duration: number }[] = [];
    for (const stage of RAG_STAGES) {
      const ts = stageTimestamps[stage];
      if (ts?.start && ts?.end) {
        result.push({ stage, label: STAGE_LABELS[stage], duration: ts.end - ts.start });
      }
    }
    return result;
  }, [stageTimestamps]);

  const hasData = stageDurations.length > 0;

  const totalDuration = useMemo(
    () => stageDurations.reduce((sum, item) => sum + item.duration, 0),
    [stageDurations],
  );

  const tokensPerSecond = useMemo(() => {
    const genTs = stageTimestamps["generating"];
    if (!genTs?.start || !genTs?.end || tokenCount === 0) return 0;
    const seconds = (genTs.end - genTs.start) / 1000;
    return seconds > 0 ? Math.round(tokenCount / seconds) : 0;
  }, [stageTimestamps, tokenCount]);

  const scores = useMemo(
    () => retrievedChunks.map((c) => c.score).filter((s) => s > 0),
    [retrievedChunks],
  );

  const barOption = useMemo(() => ({
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
      backgroundColor: "#18181b",
      borderColor: "#27272a",
      textStyle: { color: "#fafafa", fontSize: 12 },
    },
    grid: { left: 100, right: 40, top: 10, bottom: 20 },
    xAxis: {
      type: "value" as const,
      axisLabel: { color: "#71717a", formatter: (v: number) => `${v}ms` },
      splitLine: { lineStyle: { color: "#27272a" } },
    },
    yAxis: {
      type: "category" as const,
      data: stageDurations.map((d) => d.label),
      axisLabel: { color: "#a1a1aa", fontSize: 11 },
      axisLine: { lineStyle: { color: "#27272a" } },
    },
    series: [
      {
        type: "bar" as const,
        data: stageDurations.map((d, i) => ({
          value: d.duration,
          itemStyle: {
            color: i === stageDurations.length - 1
              ? "rgba(99,102,241,0.8)"
              : "rgba(99,102,241,0.4)",
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 20,
        label: {
          show: true,
          position: "right" as const,
          formatter: (p: { value: number }) => formatMs(p.value),
          color: "#a1a1aa",
          fontSize: 10,
        },
      },
    ],
  }), [stageDurations]);

  const donutOption = useMemo(() => ({
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "#18181b",
      borderColor: "#27272a",
      textStyle: { color: "#fafafa", fontSize: 12 },
    },
    series: [
      {
        type: "pie" as const,
        radius: ["45%", "75%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false } },
        data: stageDurations.map((d, i) => ({
          name: d.label,
          value: d.duration,
          itemStyle: {
            color: [
              "rgba(99,102,241,0.3)",
              "rgba(99,102,241,0.45)",
              "rgba(234,179,8,0.5)",
              "rgba(34,197,94,0.5)",
              "rgba(99,102,241,0.8)",
            ][i] ?? "rgba(99,102,241,0.3)",
          },
        })),
      },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "43%",
        style: {
          text: formatMs(totalDuration),
          fill: "#fafafa",
          fontSize: 16,
          fontWeight: 700,
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "56%",
        style: {
          text: "总耗时",
          fill: "#71717a",
          fontSize: 10,
          textAlign: "center",
        },
      },
    ],
  }), [stageDurations, totalDuration]);

  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--foreground-dim)]">提问后查看性能指标</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <ReactECharts option={barOption} style={{ height: 180 }} opts={{ renderer: "canvas" }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--foreground-dim)]">摘要检索命中</p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{retrievedChunks.length} 条</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--foreground-dim)]">段落精排命中</p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{retrievedParagraphs.length} 条</p>
        </div>
      </div>

      {scores.length > 0 && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--foreground-dim)]">分数范围</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
            {(Math.min(...scores) * 100).toFixed(0)}% — {(Math.max(...scores) * 100).toFixed(0)}%
            <span className="ml-2 text-[var(--foreground-dim)]">平均 {(scores.reduce((a, b) => a + b, 0) / scores.length * 100).toFixed(0)}%</span>
          </p>
        </div>
      )}

      {tokensPerSecond > 0 && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--foreground-dim)]">生成速度</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{tokensPerSecond} tokens/sec</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--foreground-muted)]">耗时分布</p>
        <ReactECharts option={donutOption} style={{ height: 180 }} opts={{ renderer: "canvas" }} />
      </div>
    </div>
  );
}
