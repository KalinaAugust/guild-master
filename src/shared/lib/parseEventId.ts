export function parseEventId(id: string): { realId: string; date?: string } {
  const match = id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-zA-Z]{8})_(\d{4}-\d{2}-\d{2})$/i);
  if (match) {
    return { realId: match[1], date: match[2] };
  }
  return { realId: id };
}
