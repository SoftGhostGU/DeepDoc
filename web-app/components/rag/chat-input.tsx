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
    <div className="rounded-xl border border-slate-700/70 bg-[#0f1d32]/90 p-3 shadow-[0_14px_30px_rgba(2,8,23,0.35)]">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="输入关于此文档的问题..."
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-slate-600 bg-[#0b1a2f] px-3 py-2 text-sm text-slate-100 outline-hidden transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-400">按 Enter 发送，Shift+Enter 换行</p>
        <Button size="sm" onClick={() => void submit()} disabled={disabled || !value.trim()}>
          <SendHorizonal className="h-4 w-4" />
          发送
        </Button>
      </div>
    </div>
  );
}
