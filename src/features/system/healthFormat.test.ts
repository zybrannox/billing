import { describe, expect, it } from "vitest";
import { diskStatus, formatMb, formatMs, memoryStatus, meterLevel, overallHeadline, runningFor, sparkPoints, speedStatus, workloadStatus } from "./healthFormat";

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

describe("plain language", () => {
  const perf = (over: object = {}) => ({ requests: 100, errors: 0, p50_ms: 40, p95_ms: 200, window_minutes: 15, ...over });

  it("says everything is fine when it is", () => {
    expect(overallHeadline("ok").title).toBe("Everything is running well");
    expect(overallHeadline("critical").title).toBe("There's a problem to fix");
  });

  it.each([
    [perf(), "Fast", "ok"],
    [perf({ p95_ms: 1500 }), "A bit slow", "warning"],
    [perf({ p95_ms: 3500 }), "Slow", "critical"],
  ])("judges speed", (input, headline, level) => {
    const status = speedStatus(input);
    expect(status.headline).toBe(headline);
    expect(status.level).toBe(level);
  });

  it("doesn't judge speed from a handful of requests", () => {
    expect(speedStatus(perf({ requests: 3, p95_ms: 9000 })).headline).toBe("Not measured yet");
  });

  it("says when actions failed", () => {
    expect(speedStatus(perf({ errors: 9 })).detail).toContain("9 actions failed in the last 15 minutes");
    expect(speedStatus(perf({ errors: 9 })).level).toBe("warning");
    expect(speedStatus(perf({ errors: 1 })).detail).toContain("1 action failed");
  });

  it("reads page speed as a person would say it", () => {
    expect(speedStatus(perf()).detail).toContain("under a second");
    expect(speedStatus(perf({ p50_ms: 1500, p95_ms: 2000 })).detail).toContain("about 1.5 seconds");
  });

  it("warns about disk at the same points as the server does", () => {
    const disk = (pct: number) => diskStatus({ disk_free_gb: 100, disk_total_gb: 1000, disk_free_pct: pct }).level;
    expect([disk(65), disk(9), disk(4)]).toEqual(["ok", "warning", "critical"]);
  });

  it("warns about memory at the same points as the server does", () => {
    const memory = (pct: number) => memoryStatus({ memory_available_pct: pct, memory_available_mb: 1, memory_total_mb: 2 }).level;
    expect([memory(40), memory(12), memory(5)]).toEqual(["ok", "warning", "critical"]);
  });

  it("describes workload in words", () => {
    const busy = (load: number) => workloadStatus({ load_per_core: load }).headline;
    expect([busy(0.3), busy(0.8), busy(1.2), busy(2.5)]).toEqual(["Not busy", "Fairly busy", "Very busy", "Overloaded"]);
  });

  it("says how long the server has been running", () => {
    expect(runningFor(0.2)).toContain("restarted recently");
    expect(runningFor(1)).toContain("1 hour.");
    expect(runningFor(100)).toContain("4 days");
  });

  it("uses no technical words anywhere on the main view", () => {
    const words = [
      overallHeadline("warning").detail,
      speedStatus(perf()).detail,
      diskStatus({ disk_free_gb: 1, disk_total_gb: 10, disk_free_pct: 10 }).detail,
      memoryStatus({ memory_available_pct: 40, memory_available_mb: 1, memory_total_mb: 2 }).detail,
      workloadStatus({ load_per_core: 2 }).detail,
    ].join(" ");
    expect(words).not.toMatch(/\b(cpu|ram|swap|p95|p50|ms|latency|resident|core)\b/i);
  });
});
