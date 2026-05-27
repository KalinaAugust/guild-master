import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
  const div = document.createElement('div');
  div.innerHTML = clean;
  return div.innerHTML;
}
