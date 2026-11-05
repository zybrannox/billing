export type FileKind = "image" | "pdf" | "archive" | "doc" | "sheet" | "file";

const KINDS: Record<string, FileKind> = {
  // Only what browsers can actually display: a .tif or .psd is artwork too, but
  // an <img> can't show one, so those get the "download to open" card instead.
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  pdf: "pdf",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  doc: "doc",
  docx: "doc",
  xls: "sheet",
  xlsx: "sheet",
};

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
};

export const getFileKind = (name: string): FileKind => KINDS[extensionOf(name)] ?? "file";

// "PSD file", or just "File" when there's no extension to go on.
export const fileTypeLabel = (name: string) => {
  const ext = extensionOf(name);
  return ext ? `${ext.toUpperCase()} file` : "File";
};
