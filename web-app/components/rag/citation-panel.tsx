"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types";

interface CitationPanelProps {
  citations: Citation[];
  selectedId?: number;
  onSelect?: (citation: Citation) => void;
  onViewContext?: (citation: Citation) => void;
}

export function CitationPanel({
  citations,
  selectedId,
  onSelect,
  onViewContext,
}: CitationPanelProps) {
  const itemRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    itemRefs.current[selectedId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedId]);

  return (
    <Card className="h-full border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-[var(--foreground)]">引用来源</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px] px-4 pb-4">
          <div className="space-y-3">
            {citations.length === 0 && (
              <p className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground-dim)]">
                暂无引用
              </p>
            )}
            {citations.map((citation) => (
              <article
                key={citation.id}
                ref={(element) => {
                  itemRefs.current[citation.id] = element;
                }}
                className={cn(
                  "rounded-lg border bg-[var(--surface)] p-3 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px",
                  selectedId === citation.id
                    ? "animate-citation-pulse border-[var(--border)] bg-[var(--accent-subtle)] shadow-[0_10px_20px_rgba(79,70,229,0.16)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(citation)}
                  className="mb-2 flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-[var(--foreground)]">[{citation.id}]</span>
                  <span className="font-mono text-xs text-[var(--foreground-dim)]">
                    相关度 {(citation.score * 100).toFixed(0)}%
                  </span>
                </button>

                <p className="line-clamp-4 text-sm text-[var(--foreground)]">{citation.text}</p>
                <p className="mt-2 text-xs text-[var(--foreground-dim)]">{citation.path.join(" > ")}</p>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => onViewContext?.(citation)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  查看上下文
                </Button>
              </article>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
