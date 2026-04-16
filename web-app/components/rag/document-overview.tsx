"use client";

interface DocumentOverviewProps {
  documentName: string;
  pageCount?: number | null;
  sectionCount?: number | null;
  summary?: string | null;
}

export function DocumentOverview({
  documentName,
  pageCount,
  sectionCount,
  summary,
}: DocumentOverviewProps) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">{documentName}</h3>
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] text-[var(--foreground-dim)]">
          文档导读
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--foreground-dim)]">
        {typeof pageCount === "number" && (
          <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5">{pageCount} 页</span>
        )}
        {typeof sectionCount === "number" && (
          <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5">{sectionCount} 章节</span>
        )}
      </div>

      {summary && (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--foreground-muted)]">{summary}</p>
      )}
    </section>
  );
}
