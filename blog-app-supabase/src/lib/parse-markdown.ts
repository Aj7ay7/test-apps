/**
 * Parse Markdown file content into title, optional excerpt, and body.
 * Supports:
 * - YAML frontmatter (--- ... ---) with title: and excerpt:
 * - Fallback: first # heading = title, rest = content; excerpt = first paragraph or slice
 */
export function parseMarkdownFile(raw: string): {
  title: string;
  excerpt: string;
  content: string;
} {
  const trimmed = raw.trim();
  let title = "";
  let excerpt = "";
  let content = trimmed;

  // Try frontmatter: --- on first line, then key: value lines, then ---
  const frontmatterMatch = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    content = frontmatterMatch[2].trim();
    const titleMatch = fm.match(/^title:\s*(.+)$/m);
    const excerptMatch = fm.match(/^excerpt:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, "");
    if (excerptMatch) excerpt = excerptMatch[1].trim().replace(/^["']|["']$/g, "").slice(0, 600);
  }

  // If no title from frontmatter, use first # heading or filename fallback
  if (!title && content) {
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading) {
      title = firstHeading[1].trim();
      // Optionally strip the first # line from content so we don't duplicate
      content = content.replace(/^#\s+.+?\n/, "").trim();
    }
  }

  if (!title) title = "Untitled post";

  // Excerpt: from frontmatter, or first paragraph / first 200 chars of content
  if (!excerpt && content) {
    const firstPara = content.split(/\n\s*\n/)[0]?.replace(/\n/g, " ").trim() ?? "";
    excerpt = firstPara.slice(0, 600) || title;
  } else if (!excerpt) {
    excerpt = title;
  }

  return { title, excerpt, content };
}
