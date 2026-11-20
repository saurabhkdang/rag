// 1536 -> "1.5 KB"
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// "2026-11-20T13:50:21" -> local date + time
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}
