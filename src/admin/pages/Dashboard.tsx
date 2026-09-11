import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DonutSmallRoundedIcon from "@mui/icons-material/DonutSmallRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { apiService } from "../../api/service";
import { formatDate } from "../../utils/dateFormatter";
import { getSemanticColor } from "../../utils/colors";
import { getDeliveryBadge, type RecentDelivery } from "../../utils/deliveryStatus";
import { useAppStore } from "../../store/useAppStore";

type Granularity = "day" | "week" | "month" | "year";

// A flat "Dashboard" title read the same at 8am and 8pm regardless of who
// was looking at it - this is the one place in the app that greets the
// person actually using it, the way the rest of the page already treats
// them as a specific business (real customer names, real revenue), not a
// generic template.
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface DashboardStats {
  total_customers: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delivered_projects: number;
  total_revenue: number;
  revenue_this_month: number;
  outstanding_balance: number;
  pending_invoices: number;
  overdue_invoices: number;
}

interface StatusCount {
  label: string;
  count: number;
}

interface RevenuePoint {
  period: string;
  revenue: number;
}

interface RecentInvoice {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  project_type: string | null;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
}

interface AttentionProject {
  id: number;
  project_type: string;
  customer_name: string | null;
  priority: string;
  print_status: string;
  delivery_date: string | null;
  is_overdue: boolean;
  // True when this row is here because it was delivered on credit and is
  // still unpaid - the goods are already gone, so this is the most
  // time-sensitive reason to be on this list, distinct from a delivery
  // deadline that hasn't happened yet.
  is_credit_unpaid: boolean;
}

interface TopCustomer {
  customer_name: string;
  total_spent: number;
  order_count: number;
}

interface DashboardSummary {
  stats: DashboardStats;
  project_status_breakdown: StatusCount[];
  priority_breakdown: StatusCount[];
  revenue_trend: RevenuePoint[];
  recent_invoices: RecentInvoice[];
  attention_projects: AttentionProject[];
  recent_deliveries: RecentDelivery[];
  top_customers: TopCustomer[];
}

const money = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--amber-100)", color: "var(--amber-800)", label: "Pending" },
  paid: { bg: "var(--green-100)", color: "var(--green-800)", label: "Paid" },
  cancelled: { bg: "var(--red-100)", color: "var(--red-800)", label: "Cancelled" },
};

const PROJECT_TYPE_INITIAL = (v: string | null) => (v?.trim() ? v.trim()[0].toUpperCase() : "?");

const CUSTOMER_INITIALS = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const DUE_TONE_STYLES: Record<"overdue" | "today" | "soon" | "credit", { bg: string; color: string; border: string }> = {
  overdue: { bg: "var(--red-50)", color: "var(--red-600)", border: "var(--red-200)" },
  today: { bg: "var(--orange-50)", color: "var(--orange-600)", border: "var(--orange-200)" },
  soon: { bg: "var(--amber-50)", color: "var(--amber-600)", border: "var(--amber-200)" },
  // Purple, not red/amber like the date-based tones - a delivered-on-
  // credit row isn't "running out of time" (the delivery already
  // happened), it's a different kind of risk entirely: money out the
  // door with nothing left to withhold, so it reads as its own category
  // at a glance instead of blending into "overdue".
  credit: { bg: "var(--violet-50)", color: "var(--violet-600)", border: "var(--violet-200)" },
};

// ---------------------------------------------------------------------
// Human-readable urgency label ("3d overdue", "Due today", "Due in 2d")
// computed from the actual delivery date, instead of just the static
// Overdue/Urgent badge - tells the user exactly how much runway is left
// at a glance, without opening the project. A credit-unpaid row bypasses
// all of that: its delivery_date is no longer the relevant deadline once
// the order is already gone, so it always reads as "Delivered on Credit"
// regardless of what that date says.
// ---------------------------------------------------------------------
function getDueLabel(
  deliveryDate: string | null,
  isOverdue: boolean,
  isCreditUnpaid: boolean,
): { text: string; tone: "overdue" | "today" | "soon" | "credit" } {
  if (isCreditUnpaid) return { text: "Delivered on Credit", tone: "credit" };
  if (!deliveryDate) return isOverdue ? { text: "Overdue", tone: "overdue" } : { text: "Urgent", tone: "soon" };

  const due = new Date(deliveryDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, tone: "overdue" };
  if (diffDays === 0) return { text: "Due today", tone: "today" };
  if (diffDays === 1) return { text: "Due tomorrow", tone: "soon" };
  return { text: `Due in ${diffDays}d`, tone: "soon" };
}

// ---------------------------------------------------------------------
// Date-range readout for the currently selected granularity's window -
// display only, mirrors the backend's own window math (see
// dashboard/repository.py get_revenue_trend) so the label always matches
// what the chart is actually showing.
// ---------------------------------------------------------------------
function getRangeLabel(granularity: Granularity): string {
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (granularity === "day") {
    const start = new Date(now);
    start.setDate(start.getDate() - 13);
    return `${fmt(start)} - ${fmt(now)}`;
  }
  if (granularity === "week") {
    const dow = (now.getDay() + 6) % 7; // Monday = 0
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - dow);
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * 7);
    const end = new Date(thisMonday);
    end.setDate(end.getDate() + 6);
    return `${fmt(start)} - ${fmt(end)}`;
  }
  if (granularity === "year") {
    const start = new Date(now.getFullYear() - 4, 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return `${fmt(start)} - ${fmt(end)}`;
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${fmt(start)} - ${fmt(end)}`;
}

// ---------------------------------------------------------------------
// Stat Card - a soft-shadow card with a colored top edge instead of the
// old bordered box + icon-in-a-square treatment. Lighter and more
// "floating" so it reads well sitting just under the dark hero band
// (see the Dashboard's stat row below), and the accent color is legible
// at a glance from the top edge alone, before you even reach the icon.
// ---------------------------------------------------------------------
export function StatCard({
  icon,
  label,
  value,
  color,
  bg,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        borderTop: `3px solid ${color}`,
        bgcolor: "var(--white)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 24px -16px rgba(15, 23, 42, 0.18)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 128,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "var(--slate-500)", fontWeight: 600, fontSize: "0.825rem" }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            bgcolor: bg,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--slate-900)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-400)", mt: 1, display: "block" }}>
          {sub ?? "Updated just now"}
        </Typography>
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------
// Granularity pill toggle - Day / Week / Month / Year
// ---------------------------------------------------------------------
const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function GranularityToggle({ value, onChange, dark }: { value: Granularity; onChange: (g: Granularity) => void; dark?: boolean }) {
  return (
    <Box sx={{ display: "flex", bgcolor: dark ? "rgba(255,255,255,0.1)" : "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {GRANULARITIES.map((g) => {
        const active = g.value === value;
        return (
          <Box
            key={g.value}
            component="button"
            onClick={() => onChange(g.value)}
            sx={{
              border: "none",
              px: 2,
              py: 0.75,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: "inherit",
              color: dark
                ? active ? "var(--slate-900)" : "rgba(255,255,255,0.65)"
                : active ? "var(--white)" : "var(--slate-500)",
              bgcolor: active ? (dark ? "var(--white)" : "var(--slate-900)") : "transparent",
              transition: "all 0.15s ease",
              "&:hover": {
                color: active
                  ? (dark ? "var(--slate-900)" : "var(--white)")
                  : (dark ? "var(--white)" : "var(--slate-900)"),
              },
            }}
          >
            {g.label}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------
// Small pill switcher for the merged Recent Activity card - same visual
// language as GranularityToggle above, so the two toggle controls on this
// page read as one consistent pattern rather than two different widgets.
// An optional badge (e.g. "still-unpaid credit deliveries") rides on top
// of its tab, but only while that tab isn't already the active one - once
// you're looking at it, it stops competing for attention.
// ---------------------------------------------------------------------
function ActivityTabToggle({
  value,
  onChange,
  badgeCounts,
}: {
  value: "invoices" | "deliveries";
  onChange: (v: "invoices" | "deliveries") => void;
  badgeCounts: Partial<Record<"invoices" | "deliveries", number>>;
}) {
  const tabs: { value: "invoices" | "deliveries"; label: string }[] = [
    { value: "invoices", label: "Invoices" },
    { value: "deliveries", label: "Deliveries" },
  ];
  return (
    <Box sx={{ display: "flex", bgcolor: "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {tabs.map((t) => {
        const active = t.value === value;
        const badge = badgeCounts[t.value];
        return (
          <Box
            key={t.value}
            component="button"
            onClick={() => onChange(t.value)}
            sx={{
              position: "relative",
              border: "none",
              px: 2,
              py: 0.75,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: "inherit",
              color: active ? "var(--white)" : "var(--slate-500)",
              bgcolor: active ? "var(--slate-900)" : "transparent",
              transition: "all 0.15s ease",
              "&:hover": { color: active ? "var(--white)" : "var(--slate-900)" },
            }}
          >
            {t.label}
            {!active && !!badge && (
              <Box
                sx={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  px: 0.4,
                  borderRadius: 999,
                  bgcolor: "var(--red-600)",
                  color: "var(--white)",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {badge}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------
// Revenue bar chart - dark rounded bars, active period highlighted
// ---------------------------------------------------------------------
// A smooth gradient-filled area chart, not bars - the bar version read as
// a fairly plain "spreadsheet chart"; a curved line with a soft fill below
// it and a glowing current-period marker is the more premium, editorial-
// analytics look this redesign is going for, and it's a more natural way
// to read a single continuous trend (revenue over time) than discrete
// columns are. Hover-to-inspect a period is preserved from the old bar
// chart, not dropped.
function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = hovered ?? data.length - 1;
  const width = 640;
  const height = 190;
  const chartTop = 28;
  const chartBottom = height - 30;
  const chartHeight = chartBottom - chartTop;
  // Horizontal inset for the plotted points - without it, the first/last
  // point sits exactly on x=0/x=width, and their period-label text (which
  // is centered on that x via textAnchor="middle") ends up half outside
  // the viewBox, silently clipped. The gridlines and fill below still run
  // edge to edge; only the actual data points/labels are inset.
  const chartLeft = 28;
  const chartRight = 28;
  const innerWidth = width - chartLeft - chartRight;
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const n = Math.max(1, data.length - 1);

  const points = data.map((d, i) => ({
    x: n === 0 ? width / 2 : chartLeft + (i / n) * innerWidth,
    y: chartBottom - (d.revenue / max) * chartHeight,
    d,
  }));

  // Smooth cubic-bezier line through the points (horizontal-offset control
  // points, the standard trick for a curve that never overshoots between
  // two data points) rather than sharp straight segments.
  const linePath = points.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midX = (prev.x + p.x) / 2;
    return `${path} C ${midX} ${prev.y}, ${midX} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const areaPath = `${linePath} L ${width} ${chartBottom} L 0 ${chartBottom} Z`;

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-500)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--blue-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={chartBottom - chartHeight * f}
            x2={width}
            y2={chartBottom - chartHeight * f}
            stroke="var(--slate-100)"
            strokeWidth={f === 0 ? 2 : 1}
          />
        ))}
        <path d={areaPath} fill="url(#revenueAreaFill)" />
        <path d={linePath} fill="none" stroke="var(--blue-600)" strokeWidth={2.5} strokeLinecap="round" />
        {points.map((p, i) => {
          const active = i === activeIdx;
          return (
            <g
              key={`${p.d.period}-${i}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Invisible full-height hit column, so hovering is easy to
                  land on even though the visible marker is small. Spans
                  the midpoint to each neighbor (full chart edge for the
                  first/last point), not a fixed width - correct
                  regardless of how the points themselves are spaced. */}
              <rect
                x={i === 0 ? 0 : (points[i - 1].x + p.x) / 2}
                y={chartTop}
                width={
                  (i === points.length - 1 ? width : (points[i + 1].x + p.x) / 2) -
                  (i === 0 ? 0 : (points[i - 1].x + p.x) / 2)
                }
                height={chartHeight}
                fill="transparent"
              />
              {active && (
                <line x1={p.x} y1={chartTop} x2={p.x} y2={chartBottom} stroke="var(--blue-200)" strokeWidth={1} strokeDasharray="3 3" />
              )}
              <circle cx={p.x} cy={p.y} r={active ? 5.5 : 3.5} fill="var(--white)" stroke="var(--blue-600)" strokeWidth={active ? 3 : 2} style={{ transition: "r 0.15s ease" }} />
              {active && (
                <text x={Math.min(Math.max(p.x, 40), width - 40)} y={Math.max(p.y - 14, 16)} textAnchor="middle" fontSize="12" fontWeight={800} fill="var(--slate-900)">
                  {money(p.d.revenue)}
                </text>
              )}
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                fontSize={data.length > 10 ? "9" : "11"}
                fontWeight={600}
                fill={active ? "var(--slate-900)" : "var(--slate-400)"}
              >
                {p.d.period}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Status donut - a multi-segment ring (count-weighted arcs) with the
// total in the hub and a legend beside it. Used for both Print Status
// and Priority Mix so the two "how is the workload split up" cards read
// as a matched pair rather than two different chart styles.
// ---------------------------------------------------------------------
function StatusDonut({
  data,
  colorFor,
  centerLabel,
}: {
  data: StatusCount[];
  colorFor: (label: string) => string;
  centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const size = 104;
  const stroke = 15;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
        No metric data available.
      </Typography>
    );
  }

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = d.count / total;
    const dash = fraction * circumference;
    const offset = cumulative * circumference;
    cumulative += fraction;
    return { ...d, dash, offset, color: colorFor(d.label), pct: Math.round(fraction * 100) };
  });

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
      <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={stroke} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              // `stroke` moved into `style` rather than passed as a bare
              // SVG presentation attribute - s.color can now be a CSS
              // var(--x) reference (see getSemanticColor), and var()
              // resolution inside a presentation attribute isn't
              // guaranteed the way it is in an actual style context.
              style={{ transition: "stroke-dasharray 0.6s ease", stroke: s.color }}
            />
          ))}
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: "var(--slate-900)", lineHeight: 1 }}>{total}</Typography>
          <Typography variant="caption" sx={{ color: "var(--slate-400)", fontSize: "0.65rem", mt: 0.25 }}>{centerLabel}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1, minWidth: 0 }}>
        {segments.map((s) => (
          <Box key={s.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }} noWrap>
                {s.label}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)", flexShrink: 0 }}>
              {s.count}
              <Typography component="span" variant="caption" sx={{ color: "var(--slate-400)", fontWeight: 600 }}>
                {" "}({s.pct}%)
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Attention Queue row - a compact "ticket" row (project-type avatar,
// customer + status, and a computed urgency pill) that reads at a glance
// and makes the whole row an obvious click target.
// ---------------------------------------------------------------------
function AttentionRow({ project, onClick }: { project: AttentionProject; onClick: () => void }) {
  const due = getDueLabel(project.delivery_date, project.is_overdue, project.is_credit_unpaid);
  const tone = DUE_TONE_STYLES[due.tone];

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "10px",
        border: "1px solid var(--slate-100)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": {
          borderColor: "var(--slate-200)",
          bgcolor: "var(--slate-50)",
          "& .attn-arrow": { opacity: 1, transform: "translateX(2px)" },
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          bgcolor: tone.bg,
          color: tone.color,
          border: "1px solid",
          borderColor: tone.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.9rem",
          flexShrink: 0,
        }}
      >
        {PROJECT_TYPE_INITIAL(project.project_type)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
          {project.customer_name || "Unnamed Client"}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-400)" }} noWrap>
          {project.project_type} · {project.print_status}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        <Box
          sx={{
            px: 1.1,
            py: 0.4,
            borderRadius: 999,
            bgcolor: tone.bg,
            color: tone.color,
            border: "1px solid",
            borderColor: tone.border,
            fontSize: "0.7rem",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {due.text}
        </Box>
        <ChevronRightRoundedIcon
          className="attn-arrow"
          sx={{ fontSize: 18, color: "var(--slate-300)", opacity: 0, transition: "all 0.15s ease" }}
        />
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Recent Deliveries row - the closest thing this app has to a delivery
// notification feed: every project that's been marked Delivered, most
// recent first, each carrying its current payment state so a credit
// delivery reads as "delivered, still unpaid" instead of looking
// identical to a normal paid-then-delivered order (see getDeliveryBadge).
// ---------------------------------------------------------------------
function DeliveryRow({ delivery, onClick }: { delivery: RecentDelivery; onClick: () => void }) {
  const badge = getDeliveryBadge(delivery);
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "10px",
        border: "1px solid var(--slate-100)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": { borderColor: "var(--slate-200)", bgcolor: "var(--slate-50)" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          bgcolor: "var(--blue-50)",
          color: "var(--blue-600)",
          border: "1px solid var(--blue-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <LocalShippingRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
          {delivery.customer_name || "Unnamed Client"}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-400)" }} noWrap>
          {delivery.project_type} · Delivered {formatDate(delivery.delivered_at)}
          {delivery.delivered_by ? ` by ${delivery.delivered_by}` : ""}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1.1,
          py: 0.4,
          borderRadius: 999,
          bgcolor: badge.bg,
          color: badge.color,
          fontSize: "0.7rem",
          fontWeight: 800,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {badge.label}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Customer Leaderboard row - rank medal + avatar + a relative-spend bar
// filled behind the row, so the gap between customers reads visually,
// not just as two numbers you have to compare yourself.
// ---------------------------------------------------------------------
function CustomerLeaderboardRow({ rank, customer, maxSpent }: { rank: number; customer: TopCustomer; maxSpent: number }) {
  const pct = maxSpent > 0 ? Math.max(10, Math.round((customer.total_spent / maxSpent) * 100)) : 0;
  const medal =
    rank === 1
      ? { bg: "var(--amber-100)", color: "var(--amber-800)", border: "var(--amber-200)", fill: "var(--amber-50)" }
      : rank === 2
      ? { bg: "var(--slate-100)", color: "var(--slate-600)", border: "var(--slate-200)", fill: "var(--slate-50)" }
      : rank === 3
      ? { bg: "var(--orange-100)", color: "var(--orange-800)", border: "var(--orange-300)", fill: "var(--orange-50)" }
      : { bg: "var(--slate-100)", color: "var(--slate-400)", border: "var(--slate-200)", fill: "var(--slate-50)" };

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid var(--slate-100)",
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: "var(--slate-200)" },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          bgcolor: medal.fill,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1.25 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.68rem",
            fontWeight: 800,
            bgcolor: medal.bg,
            color: medal.color,
            border: "1px solid",
            borderColor: medal.border,
            flexShrink: 0,
          }}
        >
          {rank}
        </Box>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: "var(--slate-900)",
            color: "var(--white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.72rem",
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {CUSTOMER_INITIALS(customer.customer_name)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
            {customer.customer_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {customer.order_count} {customer.order_count === 1 ? "order" : "orders"}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 800, color: "var(--slate-900)", fontSize: "0.9rem", flexShrink: 0 }}>
          {money(customer.total_spent)}
        </Typography>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Reusable Structural Card Shell
// ---------------------------------------------------------------------
export function SectionCard({
  icon,
  iconColor,
  iconBg,
  title,
  action,
  children,
  sx,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: "16px",
        border: "1px solid var(--slate-100)",
        bgcolor: "var(--white)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03), 0 12px 28px -20px rgba(15, 23, 42, 0.15)",
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "8px",
              bgcolor: iconBg,
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "1.05rem" }}>
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

// ---------------------------------------------------------------------
// Main Dashboard View Component
// ---------------------------------------------------------------------
export default function Dashboard() {
  const navigate = useNavigate();
  const username = useAppStore((s) => s.user?.username);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [activityTab, setActivityTab] = useState<"invoices" | "deliveries">("invoices");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService
      .get<DashboardSummary>("/dashboard/summary", { params: { granularity } })
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [granularity]);

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body2" color="text.secondary">Loading metrics...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen p-6 md:p-10 bg-slate-50">
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px", maxWidth: 480, mx: "auto", my: 8 }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: "var(--red-600)", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Unable to load dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            We couldn't retrieve your business stats right now. Please check your connection or try again.
          </Typography>
        </Paper>
      </main>
    );
  }

  const { stats } = data;

  const trend = data.revenue_trend;
  const lastRevenue = trend[trend.length - 1]?.revenue ?? 0;
  const prevRevenue = trend[trend.length - 2]?.revenue ?? 0;
  const deltaPct = prevRevenue > 0 ? ((lastRevenue - prevRevenue) / prevRevenue) * 100 : null;

  // Partitioned the same way getDueLabel prioritizes them (credit-unpaid
  // first, then overdue, everything else urgent) so these counts always
  // add up to exactly attention_projects.length - a row that's both
  // overdue and credit-unpaid displays and counts as the latter, not both.
  const creditUnpaidCount = data.attention_projects.filter((p) => p.is_credit_unpaid).length;
  const overdueCount = data.attention_projects.filter((p) => !p.is_credit_unpaid && p.is_overdue).length;
  const urgentCount = data.attention_projects.length - overdueCount - creditUnpaidCount;
  const maxCustomerSpend = Math.max(1, ...data.top_customers.map((c) => c.total_spent));

  const revenueUp = (deltaPct ?? 0) >= 0;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      {/* Hero band - greeting, the headline revenue number, and period
          controls live together on one dark surface instead of a plain
          white title bar with a separate dark "Total Revenue" card below
          it. This is the one visual anchor of the page everything else
          reads off of. Decorative glow blobs reuse the exact motif from
          the login page's hero panel (see common/components/auth/
          Login.tsx) so the two dark surfaces in this app feel like the
          same product, not two different templates. */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "20px",
          background: "linear-gradient(135deg, var(--blue-900) 0%, var(--slate-900) 100%)",
          p: { xs: 3, md: 4.5 },
          pb: { xs: 7, md: 8.5 },
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -40, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, var(--blue-500) 0%, transparent 70%)", opacity: 0.35, pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -80, left: "30%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, var(--indigo-500) 0%, transparent 70%)", opacity: 0.25, pointerEvents: "none" }} />

        <Box sx={{ position: "relative", display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", md: "flex-start" }, gap: 3 }}>
          <Box>
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 700, fontSize: "0.85rem" }}>
              {getGreeting()}{username ? `, ${username}` : ""}
            </Typography>
            {/* component="h1" - this is the page's real heading (the
                greeting above it is more of a label), not just large bold
                text; a plain Typography defaults to rendering as a <p>,
                which reads wrong to a screen reader. It uses no `variant`
                though (so it keeps this card's own custom sizing rather
                than MUI's preset h1 scale), which means the theme's
                per-variant heading fontFamily (see admin/Layout.tsx)
                never applies here - set directly instead of relying on
                that cascade. */}
            <Typography component="h1" sx={{ color: "var(--white)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.75rem" }, lineHeight: 1.05, mt: 1.5, m: 0 }}>
              {money(stats.total_revenue)}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
              {deltaPct !== null && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.1, py: 0.4, borderRadius: 999, bgcolor: revenueUp ? "rgba(74, 222, 128, 0.15)" : "rgba(248, 113, 113, 0.15)" }}>
                  {revenueUp ? (
                    <TrendingUpRoundedIcon sx={{ fontSize: 15, color: "var(--green-400)" }} />
                  ) : (
                    <TrendingDownRoundedIcon sx={{ fontSize: 15, color: "var(--red-400)" }} />
                  )}
                  <Typography variant="caption" sx={{ color: revenueUp ? "var(--green-400)" : "var(--red-400)", fontWeight: 700 }}>
                    {Math.abs(deltaPct).toFixed(1)}%
                  </Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                {deltaPct !== null ? "vs previous period" : "All-time total"} · Total revenue
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <GranularityToggle value={granularity} onChange={setGranularity} dark />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.15)",
                bgcolor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.8rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }} />
              {getRangeLabel(granularity)}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Stat row - pulled up to overlap the hero's bottom edge (negative
          margin), the common "floating cards" treatment that gives a flat
          page a sense of depth instead of every section just stacking
          directly on the one before it. */}
      <Box
        sx={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2.5,
          mt: { xs: -4, md: -5 },
          mb: 3,
          px: { xs: 0.5, md: 1 },
        }}
      >
        <StatCard
          icon={<AssignmentRoundedIcon fontSize="small" />}
          label="Active Projects"
          value={String(stats.active_projects)}
          color="var(--indigo-600)"
          bg="var(--indigo-50)"
          sub={`${stats.completed_projects} completed`}
        />
        <StatCard
          icon={<PeopleAltRoundedIcon fontSize="small" />}
          label="Total Customers"
          value={String(stats.total_customers)}
          color="var(--cyan-600)"
          bg="var(--cyan-50)"
        />
        <StatCard
          icon={<HourglassBottomRoundedIcon fontSize="small" />}
          label="Outstanding"
          value={money(stats.outstanding_balance)}
          color={stats.overdue_invoices > 0 ? "var(--red-600)" : "var(--amber-600)"}
          bg={stats.overdue_invoices > 0 ? "var(--red-50)" : "var(--amber-50)"}
          sub={stats.overdue_invoices > 0 ? `${stats.overdue_invoices} overdue` : `${stats.pending_invoices} pending`}
        />
      </Box>

      {/* Main workflow column + a persistent insights rail, instead of
          three same-weight grid rows stacked one after another (chart+
          donuts, then attention+leaderboard, then activity, each its own
          full-width row). Everything you'd actually act on - the revenue
          trend, what needs attention, recent activity - reads down the
          main column in one continuous line of sight; everything that's
          just a glance-at breakdown (print/priority mix, who's spending
          the most) sits in its own rail alongside it, the way an
          analytics tool separates "workspace" from "insights" rather than
          giving every section identical visual weight. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 3,
          alignItems: "start",
        }}
      >
        {/* Main column */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <SectionCard
            icon={<TrendingUpRoundedIcon fontSize="small" />}
            iconColor="var(--blue-600)"
            iconBg="var(--blue-50)"
            title="Revenue Trend"
          >
            <RevenueAreaChart data={trend} />
          </SectionCard>

          <SectionCard
            icon={<WarningAmberRoundedIcon fontSize="small" />}
            iconColor="var(--red-600)"
            iconBg="var(--red-50)"
            title="Needs Attention"
            action={
              data.attention_projects.length > 0 ? (
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  {creditUnpaidCount > 0 && (
                    <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "var(--violet-50)", color: "var(--violet-600)", fontSize: "0.7rem", fontWeight: 800 }}>
                      {creditUnpaidCount} on credit
                    </Box>
                  )}
                  {overdueCount > 0 && (
                    <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "var(--red-50)", color: "var(--red-600)", fontSize: "0.7rem", fontWeight: 800 }}>
                      {overdueCount} overdue
                    </Box>
                  )}
                  {urgentCount > 0 && (
                    <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "var(--amber-50)", color: "var(--amber-600)", fontSize: "0.7rem", fontWeight: 800 }}>
                      {urgentCount} urgent
                    </Box>
                  )}
                </Box>
              ) : undefined
            }
          >
            {data.attention_projects.length === 0 ? (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No overdue or urgent items pending.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {data.attention_projects.map((p) => (
                  <AttentionRow key={p.id} project={p} onClick={() => navigate(`/admin/projects?projectId=${p.id}`)} />
                ))}
              </Box>
            )}
          </SectionCard>

          {/* Recent Activity - Invoices and Deliveries merged into one
              tabbed card instead of two separate full-width sections.
              Deliveries already have their own always-visible surface
              (the topbar notification bell, plus Needs Attention above
              for the still-unpaid credit ones), so giving them a
              permanent full-height section here too was redundant bulk -
              a tab is enough for "let me glance at delivery history"
              without costing a whole screen's worth of scroll by default. */}
          <SectionCard
            icon={activityTab === "invoices" ? <ReceiptLongRoundedIcon fontSize="small" /> : <LocalShippingRoundedIcon fontSize="small" />}
            iconColor={activityTab === "invoices" ? "var(--emerald-600)" : "var(--blue-600)"}
            iconBg={activityTab === "invoices" ? "var(--emerald-50)" : "var(--blue-50)"}
            title="Recent Activity"
            action={
              <ActivityTabToggle
                value={activityTab}
                onChange={setActivityTab}
                badgeCounts={{ deliveries: creditUnpaidCount }}
              />
            }
          >
        {activityTab === "deliveries" ? (
          data.recent_deliveries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No deliveries recorded yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {data.recent_deliveries.map((d) => (
                <DeliveryRow key={d.id} delivery={d} onClick={() => navigate(`/admin/projects?projectId=${d.id}`)} />
              ))}
            </Box>
          )
        ) : data.recent_invoices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No recent invoices recorded.
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 640 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2.2fr 1fr 1fr 0.9fr 0.9fr",
                  px: 1.5,
                  pb: 1.5,
                  borderBottom: "1px solid var(--slate-100)",
                }}
              >
                {["Invoice", "Project Type", "Date", "Amount", "Status"].map((h, i) => (
                  <Typography
                    key={h}
                    variant="caption"
                    sx={{ fontWeight: 700, color: "var(--slate-400)", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i >= 3 ? "right" : "left" }}
                  >
                    {h}
                  </Typography>
                ))}
              </Box>
              {data.recent_invoices.map((inv) => {
                const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES.pending;
                return (
                  <Box
                    key={inv.id}
                    onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2.2fr 1fr 1fr 0.9fr 0.9fr",
                      alignItems: "center",
                      py: 1.5,
                      px: 1.5,
                      mx: -1.5,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                      "&:hover": { bgcolor: "var(--slate-50)" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "8px",
                          bgcolor: "var(--indigo-50)",
                          color: "var(--indigo-600)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          flexShrink: 0,
                        }}
                      >
                        {PROJECT_TYPE_INITIAL(inv.project_type)}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
                          {inv.customer_name || "Guest Customer"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{inv.invoice_number}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: "var(--slate-600)" }} noWrap>
                      {inv.project_type || "Custom Project"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--slate-600)" }} noWrap>
                      {formatDate(inv.created_at)}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "0.9rem", textAlign: "right" }}>
                      {money(inv.amount)}
                    </Typography>
                    <Box sx={{ textAlign: "right" }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1.25,
                          py: 0.35,
                          borderRadius: "8px",
                          bgcolor: style.bg,
                          color: style.color,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                        }}
                      >
                        {style.label}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
          </SectionCard>
        </Box>

        {/* Insights rail */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <SectionCard
            icon={<LocalShippingRoundedIcon fontSize="small" />}
            iconColor="var(--indigo-600)"
            iconBg="var(--indigo-50)"
            title="Print Status"
          >
            <StatusDonut
              data={data.project_status_breakdown}
              colorFor={(label) => getSemanticColor("printStatus", label)}
              centerLabel="projects"
            />
          </SectionCard>

          <SectionCard
            icon={<DonutSmallRoundedIcon fontSize="small" />}
            iconColor="var(--red-600)"
            iconBg="var(--red-50)"
            title="Priority Mix"
          >
            <StatusDonut
              data={data.priority_breakdown}
              colorFor={(label) => getSemanticColor("priority", label)}
              centerLabel="projects"
            />
          </SectionCard>

          <SectionCard
            icon={<EmojiEventsRoundedIcon fontSize="small" />}
            iconColor="var(--amber-600)"
            iconBg="var(--amber-50)"
            title="Top Customers"
            action={
              data.top_customers.length > 0 ? (
                <Typography variant="caption" sx={{ color: "var(--slate-400)", fontWeight: 600 }}>
                  by revenue
                </Typography>
              ) : undefined
            }
          >
            {data.top_customers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                No sales records found.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {data.top_customers.map((c, idx) => (
                  <CustomerLeaderboardRow key={c.customer_name} rank={idx + 1} customer={c} maxSpent={maxCustomerSpend} />
                ))}
              </Box>
            )}
          </SectionCard>
        </Box>
      </Box>
    </main>
  );
}
