import Link from "next/link";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function MessageBody({ body }: { body: string }) {
  let html = escapeHtml(body);

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  // Inline code `code`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-zinc-800 px-1 py-0.5 text-violet-200">$1</code>'
  );
  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-violet-300 underline" target="_blank" rel="noreferrer">$1</a>'
  );
  // Bare URLs
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" class="text-violet-300 underline break-all" target="_blank" rel="noreferrer">$1</a>'
  );
  // @mentions
  html = html.replace(
    /@([\w.-]+)/g,
    '<span class="font-medium text-violet-300">@$1</span>'
  );

  return (
    <div
      className="whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
