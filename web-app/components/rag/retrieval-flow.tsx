"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { StageNodeMemo, type StageNodeData } from "@/components/rag/flow-nodes";
import type { RagStage } from "@/types/rag";

interface RetrievalFlowProps {
  currentStage: RagStage | null;
  isStreaming: boolean;
  hasFinished: boolean;
  summaryChunkCount?: number;
  paragraphCount?: number;
}

const nodeTypes = { stage: StageNodeMemo };

const STAGE_ORDER: RagStage[] = [
  "analyzing",
  "rewriting",
  "retrieving_summary",
  "retrieving_paragraphs",
  "generating",
];

const STAGE_LABELS: Record<string, { label: string; sublabel: string }> = {
  query: { label: "用户查询", sublabel: "Query" },
  analyzing: { label: "意图分析", sublabel: "Analyze" },
  rewriting: { label: "查询改写", sublabel: "Rewrite" },
  retrieving_summary: { label: "摘要检索", sublabel: "Summary Recall" },
  retrieving_paragraphs: { label: "段落精排", sublabel: "Paragraph Refine" },
  generating: { label: "生成回答", sublabel: "Generate" },
  answer: { label: "最终答案", sublabel: "Answer" },
};

const FLOW_IDS = ["query", ...STAGE_ORDER, "answer"];
const MOBILE_BREAKPOINT = 640;

function getStageStatus(
  stage: RagStage,
  isStreaming: boolean,
  currentStage: RagStage | null,
  hasFinished: boolean,
): "inactive" | "active" | "completed" {
  if (hasFinished) {
    return "completed";
  }

  if (!isStreaming && !currentStage) {
    return "inactive";
  }

  if (stage === currentStage) {
    return "active";
  }

  if (!currentStage) {
    return "inactive";
  }

  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageIdx = STAGE_ORDER.indexOf(stage);
  if (stageIdx < currentIdx) {
    return "completed";
  }

  return "inactive";
}

export function RetrievalFlow({
  currentStage,
  isStreaming,
  hasFinished,
  summaryChunkCount,
  paragraphCount,
}: RetrievalFlowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(container);
    setContainerWidth(container.getBoundingClientRect().width);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsSmallScreen(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    const spacing = Math.max(120, containerWidth / (FLOW_IDS.length + 1));
    const nodes: Node<StageNodeData>[] = FLOW_IDS.map((id, idx) => {
      const meta = STAGE_LABELS[id];
      let status: "inactive" | "active" | "completed" = "inactive";
      let chunkCount: number | undefined;

      if (id === "query") {
        status = isStreaming || currentStage || hasFinished ? "completed" : "inactive";
      } else if (id === "answer") {
        status = hasFinished ? "completed" : currentStage === "generating" ? "active" : "inactive";
      } else {
        status = getStageStatus(id as RagStage, isStreaming, currentStage, hasFinished);
        if (id === "retrieving_summary") chunkCount = summaryChunkCount;
        if (id === "retrieving_paragraphs") chunkCount = paragraphCount;
      }

      return {
        id,
        type: "stage",
        position: { x: idx * spacing, y: 0 },
        data: { label: meta.label, sublabel: meta.sublabel, status, chunkCount },
      };
    });

    const edges: Edge[] = [];
    for (let i = 0; i < FLOW_IDS.length - 1; i++) {
      const sourceId = FLOW_IDS[i];
      const targetId = FLOW_IDS[i + 1];
      const sourceStatus = nodes[i].data.status;
      const isActive = sourceStatus === "completed" || sourceStatus === "active";
      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        animated: isActive,
        style: {
          stroke: isActive ? "var(--accent)" : "var(--border-subtle)",
          strokeWidth: isActive ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isActive ? "var(--accent)" : "var(--border-subtle)",
        },
      });
    }

    return { nodes, edges };
  }, [containerWidth, currentStage, hasFinished, isStreaming, paragraphCount, summaryChunkCount]);

  const hasQuery = isStreaming || currentStage !== null || hasFinished;

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full flex-col">
      {!hasQuery && (
        <div className="flex min-h-[200px] flex-1 items-center justify-center">
          <p className="text-sm text-[var(--foreground-dim)]">提问后查看检索路径</p>
        </div>
      )}
      {hasQuery && (
        <div className="min-h-[200px] flex-1">
          <ReactFlow
            nodes={rawNodes}
            edges={rawEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            panOnDrag={isSmallScreen ? true : undefined}
            className="bg-transparent"
          >
            <Background color="var(--border-subtle)" gap={20} size={1} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
