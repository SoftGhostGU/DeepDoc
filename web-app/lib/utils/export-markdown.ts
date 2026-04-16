import type { ChatMessage, Citation } from "@/types";

const INLINE_CITATION_REGEX = /\[(\d+)\]/g;

type MarkdownMessage = Pick<ChatMessage, "role" | "content" | "citations">;

function quoteMarkdownText(content: string) {
  const lines = content.trim().split(/\r?\n/);
  return lines.map((line) => `> ${line}`).join("\n");
}

function citationKey(citation: Citation) {
  return `${citation.paragraph_id}::${citation.path.join(" > ")}::${citation.text}`;
}

function formatCitationFootnote(index: number, citation: Citation) {
  const sourcePath = citation.path.join(" > ");
  return `[^${index}]: ${citation.text} (来源: ${sourcePath})`;
}

function replaceCitationsWithFootnotes(
  content: string,
  citations: Citation[],
  getFootnoteIndex: (citation: Citation) => number,
) {
  const citationsById = new Map(citations.map((citation) => [citation.id, citation]));

  return content.replace(INLINE_CITATION_REGEX, (match, rawId) => {
    const citationId = Number(rawId);
    const citation = citationsById.get(citationId);

    if (!citation) {
      return match;
    }

    return `[^${getFootnoteIndex(citation)}]`;
  });
}

export function formatMessageAsMarkdown(message: MarkdownMessage): string {
  if (message.role === "USER") {
    return quoteMarkdownText(message.content);
  }

  if (message.role !== "ASSISTANT") {
    return message.content;
  }

  const citations = message.citations ?? [];
  const usedFootnotes = new Set<number>();

  const markdownBody = replaceCitationsWithFootnotes(
    message.content,
    citations,
    (citation) => {
      usedFootnotes.add(citation.id);
      return citation.id;
    },
  );

  if (!citations.length) {
    return markdownBody;
  }

  const footnoteLines = citations
    .filter((citation) => usedFootnotes.has(citation.id))
    .map((citation) => formatCitationFootnote(citation.id, citation));

  if (!footnoteLines.length) {
    return markdownBody;
  }

  return `${markdownBody}\n\n${footnoteLines.join("\n")}`;
}

export function formatSessionAsMarkdown(
  messages: ChatMessage[],
  documentName: string,
  sessionTitle: string,
): string {
  const exportableMessages = messages.filter(
    (message) => message.role === "USER" || message.role === "ASSISTANT",
  );

  const citationMap = new Map<string, number>();
  const orderedCitations: Array<{ index: number; citation: Citation }> = [];
  let nextFootnote = 1;

  const sections = exportableMessages.map((message, index) => {
    const header = `### ${message.role === "USER" ? "用户" : "助手"} ${index + 1}`;

    if (message.role === "USER") {
      return `${header}\n${quoteMarkdownText(message.content)}`;
    }

    const body = replaceCitationsWithFootnotes(
      message.content,
      message.citations ?? [],
      (citation) => {
        const key = citationKey(citation);
        const existing = citationMap.get(key);
        if (existing) {
          return existing;
        }

        const current = nextFootnote;
        nextFootnote += 1;
        citationMap.set(key, current);
        orderedCitations.push({ index: current, citation });
        return current;
      },
    );

    return `${header}\n${body}`;
  });

  const title = sessionTitle || "未命名会话";
  const doc = documentName || "未命名文档";
  const date = new Date().toISOString().slice(0, 10);

  const markdownParts: string[] = [
    `# ${doc}`,
    `## ${title}`,
    `导出日期：${date}`,
    sections.join("\n\n---\n\n"),
  ];

  if (orderedCitations.length > 0) {
    markdownParts.push(
      "## 引用来源",
      orderedCitations
        .map(({ index, citation }) => formatCitationFootnote(index, citation))
        .join("\n"),
    );
  }

  return markdownParts.filter(Boolean).join("\n\n").trim();
}
