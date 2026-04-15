"use client";

import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";

interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
}: SessionSidebarProps) {
  return (
    <section className="flex h-full w-full max-w-xs flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">对话记录</h2>
        <Button size="sm" variant="outline" onClick={onCreateSession}>
          <MessageSquarePlus className="h-4 w-4" />
          新建
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-xs text-[var(--foreground-dim)]">
              暂无对话记录
            </p>
          )}

          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px",
                activeSessionId === session.id
                  ? "border-[var(--border)] bg-[var(--accent-subtle)] text-[var(--foreground)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]",
              )}
            >
              <p className="line-clamp-1 text-sm font-medium">{session.title || "未命名对话"}</p>
              <p className="mt-1 font-mono text-[11px] text-[var(--foreground-dim)]">
                {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
