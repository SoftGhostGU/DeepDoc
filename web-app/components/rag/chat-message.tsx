"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CitationMarker } from "@/components/rag/citation-marker";
import { CitationSummaryFooter } from "@/components/rag/citation-summary-footer";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, Citation } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
  selectedCitationId?: number;
  onCitationClick?: (messageId: string, citation: Citation) => void;
}

export function ChatMessage({
  message,
  selectedCitationId,
  onCitationClick,
}: ChatMessageProps) {
  const isUser = message.role === "USER";

  const citations = message.citations ?? [];
  const inTextCitationIds = Array.from(
    new Set(
      [...message.content.matchAll(/\[(\d+)\]/g)]
        .map((match) => Number(match[1]))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  const inlineCitations = citations.filter((citation) => inTextCitationIds.includes(citation.id));

  return (
    <article
      className={cn(
        "flex",
        isUser ? "justify-end animate-slide-in-right" : "justify-start animate-slide-in-left",
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-xl px-4 py-3 text-sm shadow-[0_10px_24px_rgba(0,0,0,0.16)]",
          isUser
            ? "border border-[color:rgba(99,102,241,0.22)] bg-[linear-gradient(180deg,var(--accent),var(--accent-muted))] text-white"
            : "border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--foreground)]",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-2">
            <div className="max-w-none text-sm leading-relaxed text-[var(--foreground)] [&_a]:text-[var(--accent-hover)] [&_blockquote]:border-l-[var(--accent)] [&_blockquote]:text-[var(--foreground-muted)] [&_code]:text-[var(--accent-hover)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>

            {inlineCitations.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--foreground-dim)]">
                <span>行内引用：</span>
                {inlineCitations.map((citation) => (
                  <CitationMarker
                    key={citation.id}
                    citation={citation}
                    selected={selectedCitationId === citation.id}
                    onClick={(citation) => onCitationClick?.(message.id, citation)}
                  />
                ))}
              </div>
            )}

            <CitationSummaryFooter
              messageId={message.id}
              citations={citations}
              selectedCitationId={selectedCitationId}
              onCitationClick={onCitationClick}
            />
          </div>
        )}
      </div>
    </article>
  );
}
