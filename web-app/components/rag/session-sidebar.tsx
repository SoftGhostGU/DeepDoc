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
    <section className="flex h-full w-full max-w-xs flex-col rounded-xl border border-slate-700/65 bg-[#0f1d32]/90 p-3 shadow-[0_18px_36px_rgba(2,8,23,0.4)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-cyan-100">对话记录</h2>
        <Button size="sm" variant="outline" onClick={onCreateSession}>
          <MessageSquarePlus className="h-4 w-4" />
          新建
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-600/75 bg-[#0b1a2f]/85 p-3 text-xs text-slate-400">
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
                  ? "border-cyan-300/60 bg-cyan-400/14 text-cyan-50 shadow-[0_0_16px_rgba(0,212,255,0.26)]"
                  : "border-slate-700/75 bg-[#0c1b31]/70 text-slate-300 hover:border-cyan-300/45 hover:text-cyan-100",
              )}
            >
              <p className="line-clamp-1 text-sm font-medium">{session.title || "未命名对话"}</p>
              <p className="mt-1 text-xs opacity-80">
                {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
