"use client";

interface SuggestedQuestionsProps {
  questions: string[];
  disabled?: boolean;
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ questions, disabled = false, onSelect }: SuggestedQuestionsProps) {
  if (!questions.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">推荐问题</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1.5 text-left text-xs text-[var(--foreground)] transition-[border-color,background-color,color,transform] duration-150 hover:-translate-y-px hover:border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {question}
          </button>
        ))}
      </div>
    </section>
  );
}
