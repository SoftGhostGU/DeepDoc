"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Document } from "@/types";

interface DocumentListProps {
  documents: Document[];
  compact?: boolean;
  onDeleted?: (id: string) => void;
}

const statusToBadgeVariant: Record<
  Document["status"],
  "default" | "secondary" | "warning" | "success" | "danger"
> = {
  UPLOADING: "default",
  PARSING: "warning",
  INDEXED: "success",
  FAILED: "danger",
};

const statusLabel: Record<Document["status"], string> = {
  UPLOADING: "上传中",
  PARSING: "解析中",
  INDEXED: "已索引",
  FAILED: "失败",
};

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, compact = false, onDeleted }: DocumentListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const sorted = useMemo(
    () => [...documents].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [documents],
  );

  const handleDelete = async () => {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/documents?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document (${response.status})`);
      }

      onDeleted?.(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setDeleting(false);
      return;
    }

    setDeleting(false);
  };

  return (
    <>
      <div className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}>
        {sorted.map((document, index) => (
          <Card
            key={document.id}
            className={cn(
              "animate-fade-in-up hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-[0_22px_45px_rgba(2,8,23,0.45),0_0_24px_rgba(0,212,255,0.16)]",
              compact && "p-0",
            )}
            style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
          >
            <CardHeader className={compact ? "space-y-2 p-3" : "space-y-2"}>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className={cn(compact ? "text-sm" : "text-base", "text-slate-100")}>
                  {document.originalName}
                </CardTitle>
                <Badge variant={statusToBadgeVariant[document.status]}>
                  {statusLabel[document.status]}
                </Badge>
              </div>
              {!compact && (
                <CardDescription className="text-slate-400">
                  {formatSize(document.size)} • 上传于 {formatDate(document.createdAt)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className={compact ? "flex items-center gap-2 px-3 pb-3" : "flex gap-2"}>
              <Button
                size="sm"
                variant={document.status === "INDEXED" ? "default" : "secondary"}
                disabled={document.status !== "INDEXED"}
                onClick={() => router.push(`/chat/${document.id}`)}
              >
                打开问答
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                onClick={() => setDeleteTarget(document)}
                aria-label={`删除文档 ${document.originalName}`}
                title={`删除文档 ${document.originalName}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文档？</DialogTitle>
            <DialogDescription>
              将删除文档元数据、相关对话记录和已上传文件。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
