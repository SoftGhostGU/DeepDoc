import type { Citation } from "@/types";

const DOCUMENT_COLOR_PALETTE = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
  "#84cc16",
] as const;

export function getDocumentColorByIndex(index: number) {
  const safeIndex = ((index % DOCUMENT_COLOR_PALETTE.length) + DOCUMENT_COLOR_PALETTE.length) % DOCUMENT_COLOR_PALETTE.length;
  return DOCUMENT_COLOR_PALETTE[safeIndex] ?? DOCUMENT_COLOR_PALETTE[0];
}

export function createDocumentColorMap(documentKeys: string[]) {
  const map: Record<string, string> = {};
  const seen = new Set<string>();
  let colorIndex = 0;

  for (const rawKey of documentKeys) {
    const key = rawKey.trim();
    if (!key || seen.has(key)) {
      continue;
    }

    map[key] = getDocumentColorByIndex(colorIndex);
    seen.add(key);
    colorIndex += 1;
  }

  return map;
}

export function getCitationDocumentKey(
  citation: Pick<Citation, "documentId" | "documentName">,
) {
  const key = citation.documentId?.trim() || citation.documentName?.trim();
  return key || "single-document";
}
