"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Document } from "@/types";

interface MultiDocSelectorProps {
  open: boolean;
  documents: Document[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (documentIds: string[]) => void;
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString();
}

export function MultiDocSelector({
  open,
  documents,
  onOpenChange,
  onConfirm,
}: MultiDocSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [documents],
  );

  const selectedCount = selectedIds.length;
  const canStart = selectedCount >= 2;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedIds([]);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>多文档问答</DialogTitle>
          <DialogDescription>
            选择至少 2 份已索引文档，开始跨文档联合问答。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-2">
          <div className="space-y-2">
            {sortedDocuments.length === 0 && (
              <p className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--foreground-dim)]">
                暂无可用文档，请先上传并等待索引完成。
              </p>
            )}

            {sortedDocuments.map((document) => {
              const checked = selectedIds.includes(document.id);
              const pageCountLabel =
                typeof document.pageCount === "number" && document.pageCount > 0
                  ? `${document.pageCount} 页`
                  : "页数未知";

              return (
                <label
                  key={document.id}
                  htmlFor={`multi-doc-${document.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-px",
                    checked
                      ? "border-[var(--border)] bg-[var(--accent-subtle)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border)]",
                  )}
                >
                  <input
                    id={`multi-doc-${document.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedIds((prev) => [...prev, document.id]);
                        return;
                      }

                      setSelectedIds((prev) => prev.filter((id) => id !== document.id));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {document.originalName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--foreground-dim)]">
                      {pageCountLabel} · 上传于 {formatDate(document.createdAt)}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="items-center justify-between">
          <p className="text-xs text-[var(--foreground-dim)]">已选择 {selectedCount} 份文档</p>
          <Button
            onClick={() => {
              const selectedInOrder = sortedDocuments
                .filter((document) => selectedIds.includes(document.id))
                .map((document) => document.id);
              onConfirm(selectedInOrder);
            }}
            disabled={!canStart}
          >
            开始问答
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
