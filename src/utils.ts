/** Extract a human-readable message from an unknown error value */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Simple content hash using a fast string hashing algorithm.
 * Used to detect file changes between syncs.
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

/**
 * Marker text used by MarkdownParser to encode an Obsidian embed
 * (![[file]]) as a callout block, and by AttachmentUploader to recognize
 * and resolve those callouts. Shared so the contract lives in one place.
 */
export const EMBED_PLACEHOLDER_PREFIX = "Embedded file: ";

/** Render a timestamp as a short relative-time phrase ("5m ago") */
export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Sanitize a title for use as a file or folder name */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100)
    || "Untitled";
}
