import { describe, expect, it } from "vitest";
import type { FileObject } from "../../../store/useProjectStore";
import { displayName, isDownloaded, isPurged, sizeOf, storagePath, toPreviewFile } from "./projectFile";

const record = (patch: Partial<FileObject> = {}) => ({ path: "abc-123.png", original_name: "banner.png", size_bytes: 10, ...patch }) as FileObject;

describe("project files", () => {
  it("addresses the server by storage path, but shows the real name", () => {
    expect(storagePath(record())).toBe("abc-123.png");
    expect(displayName(record())).toBe("banner.png");
  });

  it("falls back to the path for files without a recorded name", () => {
    expect(displayName(record({ original_name: "" as never }))).toBe("abc-123.png");
    expect(displayName("old.png")).toBe("old.png");
    expect(storagePath("old.png")).toBe("old.png");
  });

  it("knows nothing extra about old plain-path files", () => {
    expect(sizeOf("old.png")).toBeNull();
    expect(isDownloaded("old.png")).toBe(false);
    expect(isPurged("old.png")).toBe(false);
  });

  it("reads download and retention state from the record", () => {
    expect(isDownloaded(record({ downloaded: true }))).toBe(true);
    expect(isPurged(record({ original_deleted_at: "2026-01-01" }))).toBe(true);
    expect(toPreviewFile(record({ original_deleted_at: "2026-01-01" })).originalRemoved).toBe(true);
  });
});
