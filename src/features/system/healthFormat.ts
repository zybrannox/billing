// Display helpers for the System Health screen (kept out of the component so
// react-refresh stays happy and the rules can be unit-tested).

export const formatMb = (mb: number): string => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`);

export const formatMs = (ms: number | null | undefined): string =>
  ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;

export type Level = "ok" | "info" | "warning" | "critical";

export const LEVEL_STYLE: Record<Level, { fg: string; bg: string; label: string }> = {
  ok: { fg: "var(--emerald-700)", bg: "var(--emerald-50)", label: "Healthy" },
  info: { fg: "var(--blue-700)", bg: "var(--blue-50)", label: "Note" },
  warning: { fg: "var(--amber-800)", bg: "var(--amber-50)", label: "Needs attention" },
  critical: { fg: "var(--red-700)", bg: "var(--red-50)", label: "Problem" },
};

export const asLevel = (value: string): Level => (value in LEVEL_STYLE ? (value as Level) : "info");

// How worried to be about a meter: `higherIsWorse` for load/swap, otherwise a
// value that should stay high (free memory, free disk).
export const meterLevel = (value: number, warnAt: number, criticalAt: number, higherIsWorse: boolean): Level => {
  if (higherIsWorse) return value >= criticalAt ? "critical" : value >= warnAt ? "warning" : "ok";
  return value <= criticalAt ? "critical" : value <= warnAt ? "warning" : "ok";
};

// Points for a sparkline polyline in a width x height box; null gaps are skipped.
export const sparkPoints = (values: (number | null)[], width: number, height: number, max?: number): string => {
  const real = values.filter((v): v is number => v != null);
  if (real.length < 2) return "";
  const top = max ?? Math.max(...real, 1);
  const step = width / (values.length - 1);
  return values
    .map((v, i) => (v == null ? null : `${(i * step).toFixed(1)},${(height - (Math.min(v, top) / top) * height).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
};

// --- Plain language ---------------------------------------------------------
// What each number means for someone running a shop, not a server. The limits
// match the backend's warnings (app/system_health/diagnosis.py), so a card and
// the warning above it never disagree.

export interface PlainStatus {
  level: Level;
  headline: string;
  detail: string;
}

export const overallHeadline = (level: Level): { title: string; detail: string } => {
  switch (level) {
    case "critical":
      return { title: "There's a problem to fix", detail: "See below for what's wrong and what to do." };
    case "warning":
      return { title: "Something needs your attention", detail: "The app is working. See below for what to do." };
    case "info":
      return { title: "Everything is working", detail: "There's one thing worth knowing about below." };
    default:
      return { title: "Everything is running well", detail: "Nothing needs your attention." };
  }
};

const seconds = (ms: number) => {
  if (ms < 1000) return "under a second";
  const s = Math.round(ms / 100) / 10;
  return `about ${s} ${s === 1 ? "second" : "seconds"}`;
};

// Fewer than this and a single slow page would skew the picture.
const MIN_REQUESTS_TO_JUDGE = 10;

export const speedStatus = (performance: {
  requests: number;
  errors: number;
  p50_ms?: number | null;
  p95_ms?: number | null;
  window_minutes: number;
}): PlainStatus => {
  const { requests, errors, p50_ms: typical, p95_ms: slowest, window_minutes: minutes } = performance;
  if (requests < MIN_REQUESTS_TO_JUDGE || typical == null) {
    return { level: "ok", headline: "Not measured yet", detail: "It will show here once people have been using the app for a little while." };
  }
  const failures =
    errors > 0
      ? ` ${errors} ${errors === 1 ? "action" : "actions"} failed in the last ${minutes} minutes.`
      : "";
  const level: Level = errors / requests >= 0.05 || (slowest ?? 0) >= 1000 ? "warning" : "ok";
  const slowestNote = (slowest ?? 0) >= 1000 ? ` The slowest take ${seconds(slowest as number)}.` : "";
  return {
    level: (slowest ?? 0) >= 3000 ? "critical" : level,
    headline: (slowest ?? 0) >= 3000 ? "Slow" : (slowest ?? 0) >= 1000 ? "A bit slow" : "Fast",
    detail: `Pages usually open in ${seconds(typical)}.${slowestNote}${failures}`,
  };
};

const gb = (value: number) => (value >= 100 ? Math.round(value) : Math.round(value * 10) / 10);

export const diskStatus = (machine: { disk_free_gb: number; disk_total_gb: number; disk_free_pct: number }): PlainStatus => {
  const level = meterLevel(machine.disk_free_pct, 10, 5, false);
  return {
    level,
    headline: `${gb(machine.disk_free_gb)} GB free`,
    detail: `Out of ${gb(machine.disk_total_gb)} GB. ${
      level === "critical"
        ? "Almost full: uploads will soon start failing."
        : level === "warning"
          ? "Getting full: free up some space soon."
          : "Plenty of room for uploads."
    }`,
  };
};

export const memoryStatus = (machine: { memory_available_pct: number; memory_available_mb: number; memory_total_mb: number }): PlainStatus => {
  const level = meterLevel(machine.memory_available_pct, 15, 8, false);
  return {
    level,
    headline: level === "critical" ? "Almost none left" : level === "warning" ? "Running low" : "Yes, plenty",
    detail: `${formatMb(machine.memory_available_mb)} free out of ${formatMb(machine.memory_total_mb)}. ${
      level === "ok" ? "The app has room to work." : "Low memory makes the app feel slow."
    }`,
  };
};

export const workloadStatus = (machine: { load_per_core: number }): PlainStatus => {
  const load = machine.load_per_core;
  if (load >= 2) return { level: "critical", headline: "Overloaded", detail: "It has more work than it can keep up with." };
  if (load >= 1) return { level: "warning", headline: "Very busy", detail: "Working at full capacity, so pages may be slower." };
  if (load >= 0.7) return { level: "ok", headline: "Fairly busy", detail: "Busy, but keeping up fine." };
  return { level: "ok", headline: "Not busy", detail: "It has plenty of capacity to spare." };
};

// Whole days once it's been more than a day, so this reads like a person said it.
export const runningFor = (hours: number) => {
  if (hours < 1) return "The server was restarted recently.";
  if (hours < 48) {
    const whole = Math.round(hours);
    return `The server has been running for ${whole} ${whole === 1 ? "hour" : "hours"}.`;
  }
  return `The server has been running for ${Math.round(hours / 24)} days.`;
};

const STORAGE_LABELS: Record<string, string> = {
  "Customer files": "Customer files",
  "Image previews (thumbnails)": "Small image previews",
  "Unfinished uploads": "Uploads still in progress",
  "Database backups": "Backups",
};

export const storageLabel = (label: string) => STORAGE_LABELS[label] ?? label;
