import { useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Button, Collapse, LinearProgress, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeveloperBoardRoundedIcon from "@mui/icons-material/DeveloperBoardRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import { apiService } from "../../api/service";
import type { HealthPoint, SystemHealth } from "../../api/types";
import { formatDateTime } from "../../format/date";
import ListState from "../../ui/ListState";
import Panel from "../../ui/Panel";
import {
  asLevel,
  diskStatus,
  formatMb,
  formatMs,
  LEVEL_STYLE,
  memoryStatus,
  overallHeadline,
  runningFor,
  speedStatus,
  sparkPoints,
  storageLabel,
  workloadStatus,
  type PlainStatus,
} from "./healthFormat";
import { surfaceSx } from "../../ui/surface";

const POLL_MS = 10_000;

// Colours for the storage breakdown, in the order the folders arrive.
const STORAGE_COLORS = ["var(--blue-500)", "var(--emerald-500)", "var(--amber-500)", "var(--indigo-500)", "var(--red-400)"];

const LEVEL_ICONS = {
  ok: <CheckCircleRoundedIcon />,
  info: <InfoRoundedIcon />,
  warning: <WarningRoundedIcon />,
  critical: <ErrorRoundedIcon />,
};

// One thing about the server, answered in words anyone can read.
function StatusCard({ icon, title, status, meter }: { icon: ReactNode; title: string; status: PlainStatus; meter?: number }) {
  const style = LEVEL_STYLE[status.level];
  return (
    <Box
      sx={{
        p: 2,
        minWidth: 0,
        ...surfaceSx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: "8px", display: "grid", placeItems: "center", bgcolor: style.bg, color: style.fg, "& svg": { fontSize: 17 } }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-600)" }}>{title}</Typography>
      </Box>
      <Typography sx={{ fontSize: "var(--fs-3xl)", fontWeight: 700, color: style.fg, lineHeight: 1.2 }}>{status.headline}</Typography>
      {meter !== undefined && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, meter))}
          aria-hidden
          sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: "var(--slate-100)", "& .MuiLinearProgress-bar": { bgcolor: style.fg, borderRadius: 3 } }}
        />
      )}
      <Typography sx={{ mt: 1, fontSize: "var(--fs-sm)", color: "var(--slate-600)" }}>{status.detail}</Typography>
    </Box>
  );
}

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

// The exact figures, for a developer looking into a problem. Only rendered (and
// its history only fetched) once someone asks for it.
function TechnicalDetails({ data }: { data: SystemHealth }) {
  const [window, setWindow] = useState(60);
  const trend = useQuery({
    queryKey: ["system-health", "history", window],
    queryFn: () => apiService.get<HealthPoint[]>("/system-health/history", { params: { minutes: window } }),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
  const { machine, processes, storage, performance, pool } = data;
  const points = trend.data ?? [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, alignItems: "stretch" }}>
        <Panel title="Server" sx={{ height: "100%" }}>
          <Row label="Memory free" value={`${Math.round(machine.memory_available_pct)}% (${formatMb(machine.memory_available_mb)} of ${formatMb(machine.memory_total_mb)})`} />
          <Row label="Swap used" value={formatMb(machine.swap_used_mb)} />
          <Row label="CPU load per core" value={`${machine.load_per_core.toFixed(2)} (${machine.cpu_cores} cores, 1.0 = full)`} />
          <Row label="Disk free" value={`${Math.round(machine.disk_free_pct)}% (${machine.disk_free_gb} GB of ${machine.disk_total_gb} GB)`} />
          {pool && <Row label="Database connections in use" value={`${pool.in_use} of ${pool.size}`} />}
          {storage.database && storage.database.largest_tables.length > 0 && (
            <Row label="Largest database tables" value={storage.database.largest_tables.map((t) => `${t.name} ${formatMb(t.size_mb)}`).join(" · ")} />
          )}
        </Panel>

        <Panel title="Memory by program" description="Resident memory right now" sx={{ height: "100%" }}>
          {processes.components.map((c) => (
            <Row
              key={c.role}
              label={`${c.role}${c.processes > 1 ? ` · ${c.processes} processes` : ""}${c.memory_known ? "" : " · runs as another user"}`}
              value={c.memory_known ? `${c.approximate ? "≈ " : ""}${formatMb(c.memory_mb)}` : "not readable"}
            />
          ))}
          {processes.other_top.map((p) => (
            <Row key={p.name} label={p.name} value={`${formatMb(p.memory_mb)} (${Math.round(p.memory_pct)}%)`} warn={p.memory_pct >= 25} />
          ))}
        </Panel>
      </Box>

      <Panel title="Response times" description={`Last ${performance.window_minutes} minutes · file transfers are not counted`}>
        <Box sx={{ display: "grid", gap: { xs: 0, md: 4 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "1fr 1.4fr" } }}>
          <Box>
            <Row label="Requests" value={performance.requests.toLocaleString("en-IN")} />
            <Row label="Median (p50)" value={formatMs(performance.p50_ms)} />
            <Row label="Slowest 5% (p95)" value={formatMs(performance.p95_ms)} warn={!!performance.p95_ms && performance.p95_ms >= 1000} />
            <Row label="Server errors" value={performance.errors} warn={performance.errors > 0} />
            <Row label="Running right now" value={performance.in_flight} />
            {data.active_uploads > 0 && <Row label="Large uploads in progress" value={data.active_uploads} />}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-sm)", color: "var(--slate-500)", mt: { xs: 2, md: 1 } }}>Slowest routes</Typography>
            {performance.slowest_routes.length === 0 ? (
              <Typography sx={{ color: "var(--slate-500)", fontSize: "var(--fs-md)", py: 1 }}>No requests recorded yet.</Typography>
            ) : (
              performance.slowest_routes.slice(0, 6).map((r) => <Row key={r.route} label={`${r.route} (${r.count}×)`} value={`≈ ${formatMs(r.p95_ms)}`} />)
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
          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "1fr 1fr" } }}>
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
    </Box>
  );
}

// Admin-only, read-only: is the server OK, and is there anything to do about it?
// Written for whoever runs the shop; the exact figures are one click away for a
// developer. Polls only while the screen is visible (react-query pauses background
// polling), and the server shares one cached snapshot between every admin watching.
export default function SystemHealthPanel() {
  const [showTechnical, setShowTechnical] = useState(false);
  const health = useQuery({
    queryKey: ["system-health"],
    queryFn: () => apiService.get<SystemHealth>("/system-health"),
    refetchInterval: POLL_MS,
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

  const { machine, storage, performance, diagnosis } = data;
  const level = asLevel(diagnosis.verdict);
  const style = LEVEL_STYLE[level];
  const headline = overallHeadline(level);
  const hasFindings = level !== "ok";

  const folders = storage.folders;
  const databaseMb = storage.database?.total_mb ?? 0;
  const storageTotal = folders.reduce((sum, f) => sum + f.size_mb, 0) + databaseMb;
  const segments = [
    ...folders.map((f, i) => ({ label: storageLabel(f.label), mb: f.size_mb, files: f.files, color: STORAGE_COLORS[i % STORAGE_COLORS.length] })),
    ...(storage.database ? [{ label: "Records (customers, invoices, projects…)", mb: databaseMb, files: 0, color: "var(--slate-400)" }] : []),
  ].filter((seg) => seg.mb > 0 || seg.files > 0);

  const memoryUsedPct = 100 - machine.memory_available_pct;
  const diskUsedPct = 100 - machine.disk_free_pct;

  return (
    <>
      <Box sx={{ p: 2.5, borderRadius: "12px", bgcolor: style.bg, border: "1px solid", borderColor: "var(--slate-200)" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box sx={{ color: style.fg, display: "flex", "& svg": { fontSize: 32 } }}>{LEVEL_ICONS[level]}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h3" sx={{ fontSize: "var(--fs-2xl)", fontWeight: 700, color: style.fg, lineHeight: 1.25 }}>
              {headline.title}
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: "var(--fs-sm)", color: "var(--slate-700)" }}>
              {headline.detail} Checked {formatDateTime(data.generated_at)}. {runningFor(machine.uptime_hours)}
            </Typography>
          </Box>
        </Box>

        {hasFindings && (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            {diagnosis.findings.map((f) => (
              <Box key={f.title} sx={{ p: 1.5, borderRadius: "10px", bgcolor: "var(--white)", border: "1px solid var(--slate-200)" }}>
                <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "var(--fs-md)" }}>{f.title}</Typography>
                <Typography sx={{ mt: 0.25, color: "var(--slate-600)", fontSize: "var(--fs-sm)" }}>{f.detail}</Typography>
                <Typography sx={{ mt: 0.5, color: "var(--slate-700)", fontSize: "var(--fs-sm)" }}>
                  <b style={{ color: "var(--slate-900)" }}>What to do:</b> {f.action}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
        <StatusCard icon={<SpeedRoundedIcon />} title="How fast is the app?" status={speedStatus(performance)} />
        <StatusCard icon={<StorageRoundedIcon />} title="Is there space for files?" status={diskStatus(machine)} meter={diskUsedPct} />
        <StatusCard icon={<MemoryRoundedIcon />} title="Does the server have enough memory?" status={memoryStatus(machine)} meter={memoryUsedPct} />
        <StatusCard icon={<DeveloperBoardRoundedIcon />} title="How busy is the server?" status={workloadStatus(machine)} />
      </Box>

      <Panel
        title="What's taking up space"
        description={
          storage.computed_at
            ? `This app is using ${formatMb(storageTotal)} of your disk.`
            : "Measuring… this takes a moment after a restart."
        }
      >
        <Box sx={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", bgcolor: "var(--slate-100)", mb: 1 }}>
          {segments.map((seg) => (
            <Box key={seg.label} title={`${seg.label}: ${formatMb(seg.mb)}`} sx={{ width: `${storageTotal ? (seg.mb / storageTotal) * 100 : 0}%`, minWidth: seg.mb > 0 ? 3 : 0, bgcolor: seg.color }} />
          ))}
        </Box>
        {segments.map((seg) => (
          <Box key={seg.label} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.6, "& + &": { borderTop: "1px solid var(--slate-100)" } }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: seg.color, flexShrink: 0 }} />
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: "var(--fs-sm)", color: "var(--slate-700)" }}>
              {seg.label}
              {seg.files > 0 && (
                <Box component="span" sx={{ color: "var(--slate-400)" }}>
                  {" "}
                  · {seg.files.toLocaleString("en-IN")} {seg.files === 1 ? "file" : "files"}
                </Box>
              )}
            </Typography>
            <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600 }}>{formatMb(seg.mb)}</Typography>
          </Box>
        ))}
      </Panel>

      <Box>
        <Button
          size="small"
          onClick={() => setShowTechnical(!showTechnical)}
          aria-expanded={showTechnical}
          endIcon={<ExpandMoreRoundedIcon sx={{ transform: showTechnical ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />}
          sx={{ textTransform: "none", fontWeight: 600, color: "var(--slate-600)" }}
        >
          {showTechnical ? "Hide technical details" : "Show technical details (for developers)"}
        </Button>
        <Collapse in={showTechnical} unmountOnExit>
          <Box sx={{ mt: 1.5 }}>
            <TechnicalDetails data={data} />
          </Box>
        </Collapse>
      </Box>
    </>
  );
}
