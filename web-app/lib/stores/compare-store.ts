import { create } from "zustand";
import { createParser } from "eventsource-parser";

import type { RagCitation } from "@/types/rag";
import type { CompareSseEvent } from "@/types/rag";

interface CompareStore {
  naiveAnswer: string;
  hierarchicalAnswer: string;
  naiveCitations: RagCitation[];
  hierarchicalCitations: RagCitation[];
  naiveStreaming: boolean;
  hierarchicalStreaming: boolean;
  naiveDone: boolean;
  hierarchicalDone: boolean;
  error: string | null;
  isComparing: boolean;
  compare: (documentId: string, query: string) => Promise<void>;
  reset: () => void;
}

export const useCompareStore = create<CompareStore>((set) => ({
  naiveAnswer: "",
  hierarchicalAnswer: "",
  naiveCitations: [],
  hierarchicalCitations: [],
  naiveStreaming: false,
  hierarchicalStreaming: false,
  naiveDone: false,
  hierarchicalDone: false,
  error: null,
  isComparing: false,

  compare: async (documentId, query) => {
    const question = query.trim();
    if (!question) return;

    set({
      naiveAnswer: "",
      hierarchicalAnswer: "",
      naiveCitations: [],
      hierarchicalCitations: [],
      naiveStreaming: false,
      hierarchicalStreaming: false,
      naiveDone: false,
      hierarchicalDone: false,
      error: null,
      isComparing: true,
    });

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: documentId, query: question }),
      });

      if (!response.ok) {
        throw new Error(`Compare request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("Compare request returned no stream body");
      }

      const decoder = new TextDecoder();

      const parser = createParser({
        onEvent: (event) => {
          if (!event.data) return;

          let parsed: CompareSseEvent;
          try {
            parsed = JSON.parse(event.data) as CompareSseEvent;
          } catch {
            return;
          }

          if (parsed.event === "compare_track") {
            const track = parsed.data.track;
            const token = parsed.data.token;
            const answer = parsed.data.answer;
            const citations = parsed.data.citations;
            const done = parsed.data.done;

            if (track === "naive") {
              set((prev) => ({
                naiveStreaming: true,
                naiveAnswer: token ? prev.naiveAnswer + token : answer ?? prev.naiveAnswer,
                naiveCitations: citations ?? prev.naiveCitations,
                naiveDone: done ?? prev.naiveDone,
              }));
            } else {
              set((prev) => ({
                hierarchicalStreaming: true,
                hierarchicalAnswer: token
                  ? prev.hierarchicalAnswer + token
                  : answer ?? prev.hierarchicalAnswer,
                hierarchicalCitations: citations ?? prev.hierarchicalCitations,
                hierarchicalDone: done ?? prev.hierarchicalDone,
              }));
            }
            return;
          }

          if (parsed.event === "error") {
            set({
              error: parsed.data.message,
              isComparing: false,
            });
          }

          if (parsed.event === "final") {
            set({
              isComparing: false,
              naiveStreaming: false,
              hierarchicalStreaming: false,
              naiveDone: true,
              hierarchicalDone: true,
            });
          }
        },
      });

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }

      set((prev) => ({
        isComparing: false,
        naiveStreaming: false,
        hierarchicalStreaming: false,
        naiveDone: prev.naiveDone || true,
        hierarchicalDone: prev.hierarchicalDone || true,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Compare failed",
        isComparing: false,
        naiveStreaming: false,
        hierarchicalStreaming: false,
      });
    }
  },

  reset: () =>
    set({
      naiveAnswer: "",
      hierarchicalAnswer: "",
      naiveCitations: [],
      hierarchicalCitations: [],
      naiveStreaming: false,
      hierarchicalStreaming: false,
      naiveDone: false,
      hierarchicalDone: false,
      error: null,
      isComparing: false,
    }),
}));
