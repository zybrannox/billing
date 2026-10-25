import { describe, expect, it } from "vitest";
import { bestImageUrl, thumbnailUrl } from "./projectFileUrls";

const file = (over: object) => ({ path: "a b.png", original_available: true, size_bytes: 1000, ...over });

describe("bestImageUrl", () => {
  it("uses the real image while it exists", () => {
    expect(bestImageUrl(file({}))).toContain("/files/view/a%20b.png");
  });
  it("falls back to the thumbnail once the original is gone", () => {
    expect(bestImageUrl(file({ original_available: false }))).toBe(thumbnailUrl("a b.png"));
  });
  it("uses the thumbnail for originals above the size limit, but not below it", () => {
    expect(bestImageUrl(file({ size_bytes: 10_000_000 }), 4_000_000)).toBe(thumbnailUrl("a b.png"));
    expect(bestImageUrl(file({ size_bytes: 1_000_000 }), 4_000_000)).toContain("/files/view/");
  });
});
