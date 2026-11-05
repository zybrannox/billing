import { describe, expect, it } from "vitest";
import { fileTypeLabel, getFileKind } from "./fileKind";

describe("getFileKind", () => {
  it.each([
    ["front.JPG", "image"],
    ["logo.png", "image"],
    ["artwork.final.pdf", "pdf"],
    ["bundle.7z", "archive"],
    ["quote.docx", "doc"],
    ["rates.xlsx", "sheet"],
  ])("recognises %s", (name, kind) => {
    expect(getFileKind(name)).toBe(kind);
  });

  it.each(["design.psd", "scan.tif", "no-extension", ".hidden", "trailing."])(
    "treats %s as a file that needs downloading",
    (name) => {
      expect(getFileKind(name)).toBe("file");
    },
  );
});

describe("fileTypeLabel", () => {
  it("names the type from the extension", () => {
    expect(fileTypeLabel("Layered design.psd")).toBe("PSD file");
  });

  it("falls back when there is no extension", () => {
    expect(fileTypeLabel("no-extension")).toBe("File");
  });
});
