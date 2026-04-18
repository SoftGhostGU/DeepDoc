export function isSuspiciousExtractedText(text: string) {
  if (!text.trim()) {
    return false;
  }

  return (
    /[\uE000-\uF8FF]/u.test(text) ||
    /[\u2E80-\u2FDF]/u.test(text) ||
    /\uFFFD/u.test(text)
  );
}

export function formatCitationPage(page?: number | null) {
  if (typeof page !== "number" || page < 1) {
    return null;
  }

  return `第 ${page} 页`;
}

export function buildPdfPageHref(filename?: string, page?: number | null) {
  if (!filename?.trim()) {
    return null;
  }

  const base = `/uploads/${encodeURIComponent(filename.trim())}`;
  if (typeof page === "number" && page > 0) {
    return `${base}#page=${page}`;
  }

  return base;
}
