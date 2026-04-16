"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ComparePanel } from "@/components/rag/compare-panel";
import { ChatInput } from "@/components/rag/chat-input";
import { Button } from "@/components/ui/button";
import { useCompareStore } from "@/lib/stores/compare-store";

export default function ComparePage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const documentId = params.documentId;

  const {
    naiveAnswer,
    hierarchicalAnswer,
    naiveCitations,
    hierarchicalCitations,
    naiveStreaming,
    hierarchicalStreaming,
    naiveDone,
    hierarchicalDone,
    error,
    isComparing,
    compare,
  } = useCompareStore();

  const handleSubmit = async (q: string) => {
    await compare(documentId, q);
  };

  const bothDone = naiveDone && hierarchicalDone;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">对比模式</h1>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <ComparePanel
          title="朴素 RAG"
          answer={naiveAnswer}
          citations={naiveCitations}
          streaming={naiveStreaming}
          done={naiveDone}
        />
        <ComparePanel
          title="层级 RAG"
          answer={hierarchicalAnswer}
          citations={hierarchicalCitations}
          streaming={hierarchicalStreaming}
          done={hierarchicalDone}
        />
      </div>

      {bothDone && (
        <div className="animate-fade-in-up rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">对比摘要</h3>
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[var(--foreground-muted)]">朴素 RAG</p>
              <p className="text-[var(--foreground)]">引用: {naiveCitations.length} 条 · 回答: {naiveAnswer.length} 字符</p>
            </div>
            <div>
              <p className="text-[var(--foreground-muted)]">层级 RAG</p>
              <p className="text-[var(--foreground)]">引用: {hierarchicalCitations.length} 条 · 回答: {hierarchicalAnswer.length} 字符</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-[color:rgba(239,68,68,0.16)] bg-[color:rgba(239,68,68,0.1)] px-3 py-2 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}

      <ChatInput
        disabled={isComparing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
