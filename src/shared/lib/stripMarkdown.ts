/**
 * Strips Markdown syntax from a string to return plain text.
 * Useful for text previews or short cards where formatting is not desired.
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  return markdown
    // 1. Remove HTML tags (if any)
    .replace(/<[^>]*>/g, '')
    // 2. Remove images: ![alt](url) -> alt
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    // 3. Remove links: [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // 4. Remove bold/italic: **, *, __, _
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // 5. Remove inline code: `code`
    .replace(/`(.*?)`/g, '$1')
    // 6. Remove headers: # Header -> Header
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    // 7. Remove list items prefixes: *, -, +, 1.
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // 8. Remove blockquotes: > text -> text
    .replace(/^\s*>\s+/gm, '')
    // 9. Replace block code fences (```)
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1')
    // 10. Replace newlines with spaces for a single line preview
    .replace(/\r?\n+/g, ' ')
    // 11. Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    .trim();
}
