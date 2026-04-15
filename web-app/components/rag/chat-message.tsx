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
          "max-w-[90%] rounded-xl px-4 py-3 text-sm shadow-[0_12px_26px_rgba(2,8,23,0.34)]",
          isUser
            ? "border border-cyan-200/30 bg-cyan-400/88 text-slate-950"
            : "border border-slate-700 bg-[#102541] text-slate-100",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-2">
            <div className="max-w-none text-sm leading-relaxed text-slate-100 [&_a]:text-cyan-200 [&_blockquote]:border-l-cyan-300/50 [&_blockquote]:text-slate-300 [&_code]:text-cyan-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>

            {inlineCitations.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
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
