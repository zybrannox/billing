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
