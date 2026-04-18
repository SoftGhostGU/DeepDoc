"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { SectionNodeMemo, type SectionNodeData } from "@/components/rag/flow-nodes";
import type { DocumentTreeNode, RetrievedChunk } from "@/types/rag";

interface DocumentMindmapProps {
  tree: DocumentTreeNode | null;
  retrievedChunks?: RetrievedChunk[];
}

const nodeTypes = { section: SectionNodeMemo };

function buildNodesAndEdges(
  root: DocumentTreeNode,
  collapsed: Set<string>,
  highlightedIds: Set<string>,
  parentId?: string,
): { nodes: Node<SectionNodeData>[]; edges: Edge[] } {
  const nodes: Node<SectionNodeData>[] = [];
  const edges: Edge[] = [];
  const isCollapsed = collapsed.has(root.id);

  nodes.push({
    id: root.id,
    type: "section",
    position: { x: 0, y: 0 },
    data: {
      label: root.title,
      summary: root.summary,
      level: root.level,
      hasChildren: (root.children?.length ?? 0) > 0,
      collapsed: isCollapsed,
      highlighted: highlightedIds.has(root.id),
    },
  });

  if (parentId) {
    const highlighted = highlightedIds.has(root.id);
    edges.push({
      id: `${parentId}-${root.id}`,
      source: parentId,
      target: root.id,
      animated: highlighted,
      style: {
        stroke: highlighted ? "var(--accent)" : "var(--border-subtle)",
        strokeWidth: highlighted ? 2 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: highlighted ? "var(--accent)" : "var(--border-subtle)",
      },
    });
  }

  if (!isCollapsed && root.children) {
    for (const child of root.children) {
      const sub = buildNodesAndEdges(child, collapsed, highlightedIds, root.id);
      nodes.push(...sub.nodes);
      edges.push(...sub.edges);
    }
  }

  return { nodes, edges };
}

function layoutTree(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const childMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  for (const edge of edges) {
    const list = childMap.get(edge.source) ?? [];
    list.push(edge.target);
    childMap.set(edge.source, list);
    parentMap.set(edge.target, edge.source);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const NODE_WIDTH = 160;
  const NODE_HEIGHT = 60;
  const H_GAP = 30;
  const V_GAP = 70;

  function subtreeWidth(id: string): number {
    const children = childMap.get(id) ?? [];
    if (children.length === 0) return NODE_WIDTH;
    let total = 0;
    for (const child of children) {
      total += subtreeWidth(child) + H_GAP;
    }
    return Math.max(NODE_WIDTH, total - H_GAP);
  }

  function place(id: string, left: number, top: number) {
    const children = childMap.get(id) ?? [];
    const width = subtreeWidth(id);
    positions.set(id, { x: left + width / 2 - NODE_WIDTH / 2, y: top });
    if (children.length === 0) return;
    let offset = left;
    for (const child of children) {
      const childWidth = subtreeWidth(child);
      place(child, offset, top + NODE_HEIGHT + V_GAP);
      offset += childWidth + H_GAP;
    }
  }

  const rootId = nodes.find((node) => !parentMap.has(node.id))?.id;
  if (rootId) {
    place(rootId, 0, 0);
  }

  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? node.position,
    })),
    edges,
  };
}

export function DocumentMindmap({ tree, retrievedChunks = [] }: DocumentMindmapProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const highlightedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const chunk of retrievedChunks) {
      if (!chunk.path) {
        continue;
      }
      for (const segment of chunk.path) {
        ids.add(segment);
      }
    }
    return ids;
  }, [retrievedChunks]);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    if (!tree) {
      return { nodes: [], edges: [] };
    }
    return buildNodesAndEdges(tree, collapsed, highlightedIds);
  }, [tree, collapsed, highlightedIds]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => layoutTree(rawNodes, rawEdges),
    [rawNodes, rawEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as SectionNodeData;
    if (!data.hasChildren) {
      return;
    }
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }, []);

  if (!tree) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <p className="text-sm text-[var(--foreground-dim)]">该文档未产出结构树</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-[300px] flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Controls className="!bg-[var(--surface)] !border-[var(--border-subtle)] [&>button]:!bg-[var(--surface)] [&>button]:!border-[var(--border-subtle)] [&>button]:!text-[var(--foreground)] [&>button:hover]:!bg-[var(--surface-hover)]" />
          <Background color="var(--border-subtle)" gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
