"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMessageAsMarkdown } from "@/lib/utils/export-markdown";
import type { ChatMessage } from "@/types";

interface CopyAnswerButtonProps {
  message: ChatMessage;
}

async function copyWithFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyAnswerButton({ message }: CopyAnswerButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    const markdown = formatMessageAsMarkdown(message);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        await copyWithFallback(markdown);
      }
      setCopied(true);
    } catch {
      await copyWithFallback(markdown);
      setCopied(true);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => {
        void handleCopy();
      }}
      className="h-7 w-7 rounded-md border border-transparent bg-[var(--surface)]/80 text-[var(--foreground-dim)] backdrop-blur-sm hover:border-[var(--border-subtle)] hover:text-[var(--foreground)]"
      title={copied ? "已复制" : "复制 Markdown"}
      aria-label={copied ? "已复制" : "复制 Markdown"}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
    </Button>
  );
}
