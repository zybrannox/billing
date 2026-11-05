import { describe, expect, it } from "vitest";
import { shortcutLabel } from "./platform";

describe("shortcutLabel", () => {
  it("names the shortcut for this computer", () => {
    expect(["⌘K", "Ctrl K"]).toContain(shortcutLabel("K"));
    expect(["⌘ Enter", "Ctrl Enter"]).toContain(shortcutLabel("Enter"));
  });
});
