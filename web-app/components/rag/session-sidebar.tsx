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
    <aside className="flex h-full w-full max-w-xs flex-col rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Chat sessions</h2>
        <Button size="sm" variant="outline" onClick={onCreateSession}>
          <MessageSquarePlus className="h-4 w-4" />
          New
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sessions.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500">
              No chat sessions yet.
            </p>
          )}

          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left transition",
                activeSessionId === session.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
              )}
            >
              <p className="line-clamp-1 text-sm font-medium">{session.title || "Untitled"}</p>
              <p className="mt-1 text-xs opacity-80">
                {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
