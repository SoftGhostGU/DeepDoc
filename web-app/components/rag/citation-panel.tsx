"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { CredibilityBar } from "@/components/rag/credibility-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { createDocumentColorMap, getCitationDocumentKey } from "@/lib/utils/doc-colors";
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  const groupedCitations = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; citations: Citation[] }>();

    for (const citation of citations) {
      const key = getCitationDocumentKey(citation);
      const label =
        citation.documentName?.trim() || citation.documentId?.trim() || "未命名文档";

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { key, label, citations: [citation] });
      } else {
        existing.citations.push(citation);
      }
    }

    return Array.from(groups.values());
  }, [citations]);

  const documentColorMap = useMemo(
    () => createDocumentColorMap(groupedCitations.map((group) => group.key)),
    [groupedCitations],
  );
  const isMultiDocument = groupedCitations.length > 1;

  const selectedGroupKey = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    const selectedCitation = citations.find((citation) => citation.id === selectedId);
    return selectedCitation ? getCitationDocumentKey(selectedCitation) : null;
  }, [citations, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    requestAnimationFrame(() => {
      itemRefs.current[selectedId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [selectedId]);

  const renderCitation = (citation: Citation) => (
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
      </button>

      <CredibilityBar score={citation.score} />

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
  );

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
            {!isMultiDocument && citations.map((citation) => renderCitation(citation))}

            {isMultiDocument &&
              groupedCitations.map((group) => {
                const open = !collapsedGroups.has(group.key) || selectedGroupKey === group.key;
                const groupColor = documentColorMap[group.key] ?? "#94a3b8";

                return (
                  <section
                    key={group.key}
                    className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedGroups((previous) => {
                          const next = new Set(previous);
                          if (next.has(group.key)) {
                            next.delete(group.key);
                          } else {
                            next.add(group.key);
                          }
                          return next;
                        });
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: groupColor }}
                          aria-hidden
                        />
                        <span>{group.label}</span>
                        <span className="text-xs text-[var(--foreground-dim)]">
                          {group.citations.length} 条引用
                        </span>
                      </span>

                      <ChevronDown
                        className={cn("h-4 w-4 text-[var(--foreground-dim)] transition", open && "rotate-180")}
                      />
                    </button>

                    {open && (
                      <div className="space-y-3 border-t border-[var(--border-subtle)] p-3">
                        {group.citations.map((citation) => renderCitation(citation))}
                      </div>
                    )}
                  </section>
                );
              })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
