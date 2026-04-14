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
import type { Document } from "@/types";

interface DocumentListProps {
  documents: Document[];
  compact?: boolean;
  onDeleted?: (id: string) => void;
}

const statusToBadgeVariant: Record<Document["status"], "secondary" | "warning" | "success" | "danger"> = {
  UPLOADING: "secondary",
  PARSING: "warning",
  INDEXED: "success",
  FAILED: "danger",
};

const statusLabel: Record<Document["status"], string> = {
  UPLOADING: "Uploading",
  PARSING: "Parsing",
  INDEXED: "Indexed",
  FAILED: "Failed",
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
        {sorted.map((document) => (
          <Card key={document.id} className={compact ? "p-0" : ""}>
            <CardHeader className={compact ? "space-y-2 p-3" : "space-y-2"}>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className={compact ? "text-sm" : "text-base"}>
                  {document.originalName}
                </CardTitle>
                <Badge variant={statusToBadgeVariant[document.status]}>
                  {statusLabel[document.status]}
                </Badge>
              </div>
              {!compact && (
                <CardDescription>
                  {formatSize(document.size)} • Uploaded {formatDate(document.createdAt)}
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
                Open chat
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setDeleteTarget(document)}
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
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This will remove the document metadata, its chat sessions, and the uploaded file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
