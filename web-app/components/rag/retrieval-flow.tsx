"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
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

function getStageStatus(stage: RagStage, isStreaming: boolean, currentStage: RagStage | null): "inactive" | "active" | "completed" {
  if (!isStreaming && !currentStage) return "inactive";
  if (stage === currentStage) return "active";
  const currentIdx = STAGE_ORDER.indexOf(currentStage!);
  const stageIdx = STAGE_ORDER.indexOf(stage);
  if (stageIdx < currentIdx) return "completed";
  return "inactive";
}

export function RetrievalFlow({
  currentStage,
  isStreaming,
  summaryChunkCount,
  paragraphCount,
}: RetrievalFlowProps) {
  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    const nodes: Node<StageNodeData>[] = FLOW_IDS.map((id, idx) => {
      const meta = STAGE_LABELS[id];
      let status: "inactive" | "active" | "completed" = "inactive";
      let chunkCount: number | undefined;

      if (id === "query") {
        status = isStreaming || currentStage ? "completed" : "inactive";
      } else if (id === "answer") {
        status = !isStreaming && currentStage === null && STAGE_ORDER.some((s) => getStageStatus(s, true, STAGE_ORDER[STAGE_ORDER.length - 1]) === "completed") ? "inactive" : "inactive";
      } else {
        status = getStageStatus(id as RagStage, isStreaming, currentStage);
        if (id === "retrieving_summary") chunkCount = summaryChunkCount;
        if (id === "retrieving_paragraphs") chunkCount = paragraphCount;
      }

      return {
        id,
        type: "stage",
        position: { x: idx * 160, y: 0 },
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
  }, [currentStage, isStreaming, summaryChunkCount, paragraphCount]);

  const [nodes] = useNodesState(rawNodes);
  const [edges] = useEdgesState(rawEdges);

  const hasQuery = isStreaming || currentStage !== null;

  return (
    <div className="h-full w-full min-h-[200px]">
      {!hasQuery && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-[var(--foreground-dim)]">提问后查看检索路径</p>
        </div>
      )}
      {hasQuery && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={false}
          zoomOnScroll={false}
          className="bg-transparent"
        >
          <Background color="var(--border-subtle)" gap={20} size={1} />
        </ReactFlow>
      )}
    </div>
  );
}
