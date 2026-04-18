"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import type { ParagraphItem } from "@/types/rag";

interface DocumentHeatmapProps {
  retrievedParagraphs: ParagraphItem[];
  sectionTitleMap?: Map<string, string>;
  hasQuery?: boolean;
  onParagraphClick?: (paragraphId: string) => void;
}

const MIN_BASELINE = 2;

function scoreToColorNormalized(score: number, minScore: number, maxScore: number, count: number): string {
  if (count <= 1 || maxScore <= minScore) {
    return "#f97316";
  }

  const t = Math.min(1, Math.max(0, (score - minScore) / (maxScore - minScore)));
  if (t >= 0.8) return "#ef4444";
  if (t >= 0.6) return "#f97316";
  if (t >= 0.4) return "#3b82f6";
  if (score > 0) return "#60a5fa";
  return "#27272a";
}

export function DocumentHeatmap({
  retrievedParagraphs,
  sectionTitleMap,
  hasQuery = false,
  onParagraphClick,
}: DocumentHeatmapProps) {
  const sectionGroups = useMemo(() => {
    const groups = new Map<string, ParagraphItem[]>();
    for (const para of retrievedParagraphs) {
      const key = para.node_id ?? "unknown";
      const list = groups.get(key) ?? [];
      list.push(para);
      groups.set(key, list);
    }
    return groups;
  }, [retrievedParagraphs]);

  const scoreRange = useMemo(() => {
    if (retrievedParagraphs.length === 0) {
      return { min: 0, max: 0, count: 0 };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const paragraph of retrievedParagraphs) {
      const score = paragraph.score ?? 0;
      min = Math.min(min, score);
      max = Math.max(max, score);
    }

    return { min, max, count: retrievedParagraphs.length };
  }, [retrievedParagraphs]);

  const option = useMemo(() => {
    const data = Array.from(sectionGroups.entries()).map(([sectionId, paras]) => ({
      name: sectionTitleMap?.get(sectionId) ?? "未分类",
      children: paras.map((para) => {
        const score = para.score ?? 0;
        return {
          name: `段落 ${para.index}`,
          value: score * 100 + MIN_BASELINE,
          paraId: para.id,
          text: para.text,
          score,
          sectionPath: para.node_id ?? "",
          sectionTitle: sectionTitleMap?.get(sectionId) ?? "未分类",
          paraIndex: para.index,
          itemStyle: {
            color: scoreToColorNormalized(score, scoreRange.min, scoreRange.max, scoreRange.count),
            borderColor: "#18181b",
            borderWidth: 1,
          },
        };
      }),
    }));

    return {
      tooltip: {
        formatter: (info: {
          data: {
            paraIndex?: number;
            sectionPath: string;
            sectionTitle?: string;
            score: number;
            text: string;
            name: string;
          };
        }) => {
          const d = info.data;
          if (d.paraIndex == null) {
            return d.name;
          }
          const scoreText = `相关度 ${(d.score * 100).toFixed(0)}%`;
          const sectionLabel = d.sectionTitle || d.sectionPath || "未分类";
          return `<div style="max-width:280px">
            <b>段落 ${d.paraIndex}</b> · ${sectionLabel}
            <br/>${scoreText}
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
  }, [scoreRange.count, scoreRange.max, scoreRange.min, sectionGroups, sectionTitleMap]);

  if (retrievedParagraphs.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <p className="text-sm text-[var(--foreground-dim)]">
          {hasQuery ? "本次检索暂无相关段落" : "提问后查看相关度分布"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-[300px] flex-1">
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
    </div>
  );
}
