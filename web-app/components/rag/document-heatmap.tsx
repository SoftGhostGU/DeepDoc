"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import type { ParagraphItem, RetrievedChunk } from "@/types/rag";

interface DocumentHeatmapProps {
  paragraphs: ParagraphItem[];
  retrievedChunks?: RetrievedChunk[];
  onParagraphClick?: (paragraphId: string) => void;
}

function scoreToColor(score: number): string {
  if (score >= 0.9) return "#ef4444";
  if (score >= 0.7) return "#f97316";
  if (score >= 0.5) return "#3b82f6";
  if (score > 0) return "#60a5fa";
  return "#27272a";
}

export function DocumentHeatmap({
  paragraphs,
  retrievedChunks = [],
  onParagraphClick,
}: DocumentHeatmapProps) {
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const chunk of retrievedChunks) {
      map.set(chunk.id, chunk.score);
    }
    return map;
  }, [retrievedChunks]);

  const sectionGroups = useMemo(() => {
    const groups = new Map<string, ParagraphItem[]>();
    for (const para of paragraphs) {
      const key = para.node_id ?? "unknown";
      const list = groups.get(key) ?? [];
      list.push(para);
      groups.set(key, list);
    }
    return groups;
  }, [paragraphs]);

  const hasScores = retrievedChunks.length > 0;

  const option = useMemo(() => {
    const data = Array.from(sectionGroups.entries()).map(([sectionId, paras]) => ({
      name: sectionId,
      children: paras.map((para) => {
        const score = scoreMap.get(para.id) ?? 0;
        return {
          name: `段落 ${para.index}`,
          value: hasScores ? score * 100 : 10,
          paraId: para.id,
          text: para.text,
          score,
          sectionPath: para.node_id ?? "",
          paraIndex: para.index,
          itemStyle: {
            color: hasScores ? scoreToColor(score) : "#27272a",
            borderColor: "#18181b",
            borderWidth: 1,
          },
        };
      }),
    }));

    return {
      tooltip: {
        formatter: (info: { data: { paraIndex: number; sectionPath: string; score: number; text: string; name: string } }) => {
          const d = info.data;
          if (!d.paraIndex) return d.name;
          const scoreText = hasScores ? `<br/>相关度: ${(d.score * 100).toFixed(0)}%` : "<br/>未检索";
          return `<div style="max-width:280px">
            <b>段落 ${d.paraIndex}</b> · ${d.sectionPath}${scoreText}
            <br/><span style="color:#a1a1aa;font-size:11px">${d.text.slice(0, 100)}${d.text.length > 100 ? "..." : ""}</span>
          </div>`;
        },
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#fafafa", fontSize: 12 },
      },
      series: [
        {
          type: "treemap",
          data,
          width: "100%",
          height: "100%",
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          nodeClick: false,
          roam: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: "{b}",
            fontSize: 10,
            color: "#a1a1aa",
          },
          upperLabel: {
            show: true,
            height: 22,
            formatter: "{b}",
            fontSize: 11,
            color: "#fafafa",
            backgroundColor: "#18181b",
          },
          itemStyle: {
            borderColor: "#18181b",
            borderWidth: 2,
            gapWidth: 2,
          },
          levels: [
            {
              itemStyle: {
                borderColor: "#27272a",
                borderWidth: 4,
                gapWidth: 4,
              },
              upperLabel: { show: true },
            },
            {
              colorSaturation: [0.3, 0.7],
              itemStyle: {
                borderColorSaturation: 0.6,
                gapWidth: 1,
                borderWidth: 1,
              },
            },
          ],
        },
      ],
    };
  }, [sectionGroups, scoreMap, hasScores]);

  if (paragraphs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--foreground-dim)]">暂无段落数据</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[300px]">
      {!hasScores && (
        <p className="mb-2 text-xs text-[var(--foreground-dim)]">提问后查看相关度分布</p>
      )}
      <ReactECharts
        option={option}
        style={{ height: "100%", minHeight: 280 }}
        opts={{ renderer: "canvas" }}
        onEvents={{
          click: (params: { data?: { paraId?: string } }) => {
            const paraId = params.data?.paraId;
            if (paraId && onParagraphClick) {
              onParagraphClick(paraId);
            }
          },
        }}
      />
    </div>
  );
}
