import type { ProjectFile } from "../api/types";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const originalUrl = (path: string) => `${API_BASE_URL}/files/view/${encodeURIComponent(path)}`;
export const thumbnailUrl = (path: string) => `${API_BASE_URL}/files/thumbnail/${encodeURIComponent(path)}`;

// The best picture available for a file: the real image while it still exists
// (and is not larger than `maxOriginalBytes`), otherwise its thumbnail - the
// weekly clean-up removes originals of finished jobs and keeps the thumbnail.
export const bestImageUrl = (file: Pick<ProjectFile, "path" | "original_available" | "size_bytes">, maxOriginalBytes = Infinity) =>
  file.original_available && (file.size_bytes ?? 0) <= maxOriginalBytes ? originalUrl(file.path) : thumbnailUrl(file.path);
