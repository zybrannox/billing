import type { FileObject } from "../../../store/useProjectStore";
import type { PreviewFile } from "../../../ui/FilePreviewDialog";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Older projects list plain storage paths rather than file records.
export type ProjectFile = string | FileObject;

// The stored, UUID-based on-disk name - required as-is for every /files/* API
// call (thumbnail/download/view/delete are all keyed by it).
export const storagePath = (f: ProjectFile) => (typeof f === "string" ? f : f.path);

// What the user actually named the file - what should ever be shown on screen
// or saved-as on download. Falls back to the storage path only for files
// uploaded before original_name was tracked.
export const displayName = (f: ProjectFile) => (typeof f === "string" ? f : f.original_name || f.path);

export const sizeOf = (f: ProjectFile) => (typeof f === "string" ? null : f.size_bytes);

export const isDownloaded = (f: ProjectFile) => typeof f !== "string" && !!f.downloaded;

// The original was permanently removed by the weekly retention job (see backend
// app/project_files/retention.py): the row and thumbnail still exist, but
// there's nothing left to download.
export const isPurged = (f: ProjectFile) => typeof f !== "string" && !!f.original_deleted_at;

export const thumbnailUrl = (path: string) => `${API_BASE_URL}/files/thumbnail/${encodeURIComponent(path)}`;

export const toPreviewFile = (f: ProjectFile): PreviewFile => ({
  path: storagePath(f),
  name: displayName(f),
  sizeBytes: sizeOf(f),
  pixelWidth: typeof f === "string" ? null : f.pixel_width,
  pixelHeight: typeof f === "string" ? null : f.pixel_height,
  originalRemoved: isPurged(f),
});
