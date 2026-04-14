"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChatInputProps {
  disabled?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
}

export function ChatInput({ disabled = false, onSubmit }: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }

    setValue("");
    await onSubmit(trimmed);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Ask a question about this document..."
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">Enter to send, Shift+Enter for newline</p>
        <Button size="sm" onClick={() => void submit()} disabled={disabled || !value.trim()}>
          <SendHorizonal className="h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
