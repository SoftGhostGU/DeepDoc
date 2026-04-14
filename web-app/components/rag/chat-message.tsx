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
  onCitationClick?: (citation: Citation) => void;
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
    <article className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-xl px-4 py-3 text-sm",
          isUser ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-900",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-2">
            <div className="prose prose-slate max-w-none text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>

            {inlineCitations.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                <span>Inline citations:</span>
                {inlineCitations.map((citation) => (
                  <CitationMarker
                    key={citation.id}
                    citation={citation}
                    selected={selectedCitationId === citation.id}
                    onClick={onCitationClick}
                  />
                ))}
              </div>
            )}

            <CitationSummaryFooter
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
