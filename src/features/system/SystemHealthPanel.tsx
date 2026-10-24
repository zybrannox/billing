import { useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import DeveloperBoardRoundedIcon from "@mui/icons-material/DeveloperBoardRounded";
import { apiService } from "../../api/service";
import type { HealthPoint, SystemHealth } from "../../api/types";
import { formatDateTime } from "../../format/date";
import ListState from "../../ui/ListState";
import MetricTile from "../../ui/MetricTile";
import Panel from "../../ui/Panel";
import { asLevel, formatMb, formatMs, LEVEL_STYLE, meterLevel, sparkPoints } from "./healthFormat";

const POLL_MS = 10_000;

// Colours for the storage breakdown, in the order the folders arrive.
const STORAGE_COLORS = ["var(--blue-500)", "var(--emerald-500)", "var(--amber-500)", "var(--indigo-500)", "var(--red-400)"];

function Row({ label, value, warn = false }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "baseline", py: 0.6, "& + &": { borderTop: "1px solid var(--slate-100)" } }}>
      <Typography sx={{ color: "var(--slate-600)", fontSize: "var(--fs-sm)" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 600, fontSize: "var(--fs-sm)", textAlign: "right", color: warn ? "var(--amber-700)" : "var(--slate-900)" }}>{value}</Typography>
    </Box>
  );
}

function Spark({ title, values, max, unit }: { title: string; values: (number | null)[]; max?: number; unit: string }) {
  const points = sparkPoints(values, 300, 48, max);
  const last = [...values].reverse().find((v) => v != null);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography sx={{ color: "var(--slate-600)", fontSize: "var(--fs-sm)" }}>{title}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-sm)" }}>{last != null ? `${Math.round(last * 10) / 10}${unit}` : "—"}</Typography>
      </Box>
      <svg viewBox="0 0 300 48" width="100%" height="48" role="img" aria-label={`${title} over time`} preserveAspectRatio="none">
        <line x1="0" y1="47.5" x2="300" y2="47.5" stroke="var(--slate-200)" />
        {points && <polyline points={points} fill="none" stroke="var(--blue-600)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />}
      </svg>
    </Box>
  );
}

// Admin-only, read-only view of how much space and memory the app uses and
// why it might be slow. Polls only while the screen is visible (react-query
// pauses background polling), and the server shares one cached snapshot
// between every admin watching.
export default function SystemHealthPanel() {
  const [window, setWindow] = useState(60);
  const health = useQuery({
    queryKey: ["system-health"],
    queryFn: () => apiService.get<SystemHealth>("/system-health"),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });
  const trend = useQuery({
    queryKey: ["system-health", "history", window],
    queryFn: () => apiService.get<HealthPoint[]>("/system-health/history", { params: { minutes: window } }),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

  const data = health.data;
  if (!data) {
    return (
      <Panel title="System health">
        <ListState loading={health.isPending} error={health.isError} empty={false} errorText="Couldn't load system health." emptyText="" />
      </Panel>
    );
  }

  const { machine, processes, storage, performance, diagnosis, pool } = data;
  const verdict = LEVEL_STYLE[asLevel(diagnosis.verdict)];
  const points = trend.data ?? [];
  const folders = storage.folders;
  const databaseMb = storage.database?.total_mb ?? 0;
  const storageTotal = folders.reduce((sum, f) => sum + f.size_mb, 0) + databaseMb;
  const segments = [
    ...folders.map((f, i) => ({ label: f.label, mb: f.size_mb, detail: `${f.files.toLocaleString("en-IN")} files`, color: STORAGE_COLORS[i % STORAGE_COLORS.length] })),
    ...(storage.database ? [{ label: "Database", mb: databaseMb, detail: "", color: "var(--slate-400)" }] : []),
  ];

  const memLevel = meterLevel(machine.memory_available_pct, 15, 8, false);
  const cpuLevel = meterLevel(machine.load_per_core, 1, 2, true);
  const diskLevel = meterLevel(machine.disk_free_pct, 10, 5, false);
  const slowLevel = performance.p95_ms && performance.p95_ms >= 3000 ? "critical" : performance.p95_ms && performance.p95_ms >= 1000 ? "warning" : "ok";
  const asMetric = (l: string) => (l === "critical" ? "critical" : l === "warning" ? "warning" : "ok") as "ok" | "warning" | "critical";

  return (
    <>
      {/* The answer to "why is it lagging?" comes first. */}
      <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "var(--white)", border: "1px solid var(--slate-200)", borderLeft: `4px solid ${verdict.fg}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: verdict.fg }} />
          <Typography sx={{ fontWeight: 700, color: verdict.fg, fontSize: "var(--fs-md)" }}>{verdict.label}</Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {diagnosis.findings.map((f) => (
            <Box key={f.title}>
              <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "var(--fs-md)" }}>{f.title}</Typography>
              <Typography sx={{ color: "var(--slate-600)", fontSize: "var(--fs-sm)" }}>{f.detail}</Typography>
              <Typography sx={{ color: "var(--slate-600)", fontSize: "var(--fs-sm)" }}>
                <b style={{ color: "var(--slate-900)" }}>What to do:</b> {f.action}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Four numbers that matter, readable in a second. */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        <MetricTile
          label="Memory free"
          icon={<MemoryRoundedIcon />}
          value={`${Math.round(machine.memory_available_pct)}%`}
          caption={`${formatMb(machine.memory_available_mb)} of ${formatMb(machine.memory_total_mb)}${machine.swap_used_mb > 0 ? ` · ${formatMb(machine.swap_used_mb)} swap` : ""}`}
          level={asMetric(memLevel)}
        />
        <MetricTile
          label="CPU load"
          icon={<DeveloperBoardRoundedIcon />}
          value={machine.load_per_core.toFixed(2)}
          caption={`per core · ${machine.cpu_cores} cores (1.0 = full)`}
          level={asMetric(cpuLevel)}
        />
        <MetricTile
          label="Disk free"
          icon={<StorageRoundedIcon />}
          value={`${Math.round(machine.disk_free_pct)}%`}
          caption={`${machine.disk_free_gb} GB of ${machine.disk_total_gb} GB`}
          level={asMetric(diskLevel)}
        />
        <MetricTile
          label="Slowest 5% of pages"
          icon={<SpeedRoundedIcon />}
          value={formatMs(performance.p95_ms)}
          caption={`typical ${formatMs(performance.p50_ms)} · ${performance.requests.toLocaleString("en-IN")} requests`}
          level={asMetric(slowLevel)}
        />
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, alignItems: "stretch" }}>
        <Panel
          title="Space used by this app"
          description={
            storage.computed_at
              ? `Measured ${formatDateTime(storage.computed_at)}${storage.complete ? "" : " (partial - a folder is very large)"}`
              : "Measuring… this takes a moment after a restart."
          }
          sx={{ height: "100%" }}
        >
          <Typography sx={{ fontSize: "var(--fs-4xl)", fontWeight: 700, color: "var(--slate-900)", mb: 1 }}>{formatMb(storageTotal)}</Typography>
          {/* One bar split into the parts, so it is clear what takes the space. */}
          <Box sx={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", bgcolor: "var(--slate-100)", mb: 1 }}>
            {segments.map((seg) => (
              <Box key={seg.label} title={`${seg.label}: ${formatMb(seg.mb)}`} sx={{ width: `${storageTotal ? (seg.mb / storageTotal) * 100 : 0}%`, minWidth: seg.mb > 0 ? 3 : 0, bgcolor: seg.color }} />
            ))}
          </Box>
          {segments.map((seg) => (
            <Box key={seg.label} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.6, "& + &": { borderTop: "1px solid var(--slate-100)" } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: seg.color, flexShrink: 0 }} />
              <Typography sx={{ flex: 1, fontSize: "var(--fs-sm)", color: "var(--slate-700)" }}>
                {seg.label}
                {seg.detail && <Box component="span" sx={{ color: "var(--slate-400)" }}> · {seg.detail}</Box>}
              </Typography>
              <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{formatMb(seg.mb)}</Typography>
            </Box>
          ))}
          {storage.database && storage.database.largest_tables.length > 0 && (
            <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-xs)", mt: 1.5 }}>
              Largest database tables: {storage.database.largest_tables.map((t) => `${t.name} ${formatMb(t.size_mb)}`).join(" · ")}
            </Typography>
          )}
        </Panel>

        <Panel title="What is using the memory" description="Resident memory right now" sx={{ height: "100%" }}>
          {processes.components.map((c) => (
            <Row
              key={c.role}
              label={`${c.role}${c.processes > 1 ? ` · ${c.processes} processes` : ""}${c.memory_known ? "" : " · runs as another user"}`}
              value={c.memory_known ? `${c.approximate ? "≈ " : ""}${formatMb(c.memory_mb)}` : "not readable"}
            />
          ))}
          <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--slate-500)", mt: 2, mb: 0.5 }}>Biggest other programs on the server</Typography>
          {processes.other_top.map((p) => (
            <Row key={p.name} label={p.name} value={`${formatMb(p.memory_mb)} (${Math.round(p.memory_pct)}%)`} warn={p.memory_pct >= 25} />
          ))}
          {pool && (
            <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-xs)", mt: 1.5 }}>
              Database connections in use: {pool.in_use} of {pool.size}
            </Typography>
          )}
        </Panel>
      </Box>

      <Panel title="Response times" description={`Last ${performance.window_minutes} minutes · file transfers are not counted`}>
        <Box sx={{ display: "grid", gap: { xs: 0, md: 4 }, gridTemplateColumns: { xs: "1fr", md: "1fr 1.4fr" } }}>
          <Box>
            <Row label="Requests" value={performance.requests.toLocaleString("en-IN")} />
            <Row label="Typical (median)" value={formatMs(performance.p50_ms)} />
            <Row label="Slowest 5%" value={formatMs(performance.p95_ms)} warn={!!performance.p95_ms && performance.p95_ms >= 1000} />
            <Row label="Server errors" value={performance.errors} warn={performance.errors > 0} />
            <Row label="Running right now" value={performance.in_flight} />
            {data.active_uploads > 0 && <Row label="Large uploads in progress" value={data.active_uploads} />}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--slate-500)", mt: { xs: 2, md: 1 } }}>Slowest pages</Typography>
            {performance.slowest_routes.length === 0 ? (
              <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-md)", py: 1 }}>No requests recorded yet.</Typography>
            ) : (
              performance.slowest_routes.slice(0, 6).map((r) => (
                <Row key={r.route} label={`${r.route} (${r.count}×)`} value={`≈ ${formatMs(r.p95_ms)}`} />
              ))
            )}
          </Box>
        </Box>
      </Panel>

      <Panel
        title="Trend"
        description="Snapshots are saved every minute and kept for 7 days."
        action={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={window}
            onChange={(_, v) => v && setWindow(v)}
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "var(--fs-sm)",
                px: 1.5,
                py: 0.4,
                color: "var(--slate-600)",
                borderColor: "var(--slate-200)",
                "&.Mui-selected": { bgcolor: "var(--blue-50)", color: "var(--blue-700)" },
              },
            }}
          >
            <ToggleButton value={60}>1 hour</ToggleButton>
            <ToggleButton value={1440}>24 hours</ToggleButton>
            <ToggleButton value={10080}>7 days</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        {points.length < 2 ? (
          <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-md)" }}>Not enough history yet - it fills in a minute at a time.</Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <Spark title="Free memory" values={points.map((p) => p.memory_available_pct)} max={100} unit="%" />
            <Spark title="Slowest 5% of requests" values={points.map((p) => p.p95_ms)} unit=" ms" />
            <Spark title="CPU load per core" values={points.map((p) => p.load_per_core)} unit="" />
            <Spark title="Memory used by this app" values={points.map((p) => p.app_memory_mb)} unit=" MB" />
          </Box>
        )}
      </Panel>

      {data.slow_queries.length > 0 && (
        <Panel title="Slow database queries" description="Most recent first. Statement text only - no customer data.">
          {data.slow_queries.slice(0, 6).map((q) => (
            <Box key={`${q.at}-${q.statement}`} sx={{ py: 1, "& + &": { borderTop: "1px solid var(--slate-100)" } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-500)" }}>{formatDateTime(q.at)}</Typography>
                <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--amber-700)" }}>{formatMs(q.ms)}</Typography>
              </Box>
              <Typography sx={{ color: "var(--slate-600)", fontSize: "var(--fs-xs)", wordBreak: "break-word", fontFamily: "ui-monospace, monospace" }}>{q.statement}</Typography>
            </Box>
          ))}
        </Panel>
      )}
    </>
  );
}
