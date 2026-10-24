import { describe, expect, it } from "vitest";
import { formatMb, formatMs, meterLevel, sparkPoints } from "./healthFormat";

describe("health formatting", () => {
  it("formats sizes and durations for humans", () => {
    expect(formatMb(512)).toBe("512 MB");
    expect(formatMb(2048)).toBe("2.0 GB");
    expect(formatMs(null)).toBe("—");
    expect(formatMs(240)).toBe("240 ms");
    expect(formatMs(1600)).toBe("1.6 s");
  });
  it("grades meters in both directions", () => {
    expect(meterLevel(3, 15, 8, false)).toBe("critical"); // free memory %
    expect(meterLevel(12, 15, 8, false)).toBe("warning");
    expect(meterLevel(40, 15, 8, false)).toBe("ok");
    expect(meterLevel(2.2, 1, 2, true)).toBe("critical"); // load per core
  });
  it("draws nothing for fewer than two points and skips gaps", () => {
    expect(sparkPoints([5], 100, 20)).toBe("");
    expect(sparkPoints([0, null, 10], 100, 20, 10).split(" ")).toHaveLength(2);
  });
});
