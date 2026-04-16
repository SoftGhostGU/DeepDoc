"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatSessionAsMarkdown } from "@/lib/utils/export-markdown";
import type { ChatMessage } from "@/types";

interface ExportConversationButtonProps {
  messages: ChatMessage[];
  documentName: string;
  sessionTitle: string;
}

function sanitizeFilePart(input: string) {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ExportConversationButton({
  messages,
  documentName,
  sessionTitle,
}: ExportConversationButtonProps) {
  const exportableMessages = useMemo(
    () => messages.filter((message) => message.role === "USER" || message.role === "ASSISTANT"),
    [messages],
  );

  const disabled = exportableMessages.length === 0;

  const handleExport = () => {
    if (disabled) {
      return;
    }

    const markdown = formatSessionAsMarkdown(
      exportableMessages,
      documentName || "未命名文档",
      sessionTitle || "未命名会话",
    );

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `DeepDoc-${sanitizeFilePart(documentName || "document")}-${sanitizeFilePart(sessionTitle || "session")}-${date}.md`;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={handleExport}
      title={disabled ? "当前会话暂无可导出内容" : "导出当前会话为 Markdown"}
    >
      <Download className="h-4 w-4" />
      导出对话
    </Button>
  );
}
