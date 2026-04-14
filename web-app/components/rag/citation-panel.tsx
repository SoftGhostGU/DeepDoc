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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Citations</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px] px-4 pb-4">
          <div className="space-y-3">
            {citations.length === 0 && (
              <p className="text-sm text-slate-500">No citations for this message yet.</p>
            )}
            {citations.map((citation) => (
              <article
                key={citation.id}
                ref={(element) => {
                  itemRefs.current[citation.id] = element;
                }}
                className={cn(
                  "rounded-lg border p-3 transition",
                  selectedId === citation.id
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(citation)}
                  className="mb-2 flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-slate-900">[{citation.id}]</span>
                  <span className="text-xs text-slate-500">Score {(citation.score * 100).toFixed(0)}%</span>
                </button>

                <p className="line-clamp-4 text-sm text-slate-700">{citation.text}</p>
                <p className="mt-2 text-xs text-slate-500">{citation.path.join(" > ")}</p>

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => onViewContext?.(citation)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View in context
                </Button>
              </article>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
