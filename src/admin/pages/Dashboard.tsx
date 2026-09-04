import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
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

type Granularity = "day" | "week" | "month" | "year";

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
  top_customers: TopCustomer[];
}

const money = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  paid: { bg: "#DCFCE7", color: "#166534", label: "Paid" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
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

const DUE_TONE_STYLES: Record<"overdue" | "today" | "soon", { bg: string; color: string; border: string }> = {
  overdue: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  today: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
  soon: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
};

// ---------------------------------------------------------------------
// Human-readable urgency label ("3d overdue", "Due today", "Due in 2d")
// computed from the actual delivery date, instead of just the static
// Overdue/Urgent badge - tells the user exactly how much runway is left
// at a glance, without opening the project.
// ---------------------------------------------------------------------
function getDueLabel(deliveryDate: string | null, isOverdue: boolean): { text: string; tone: "overdue" | "today" | "soon" } {
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
// Dark hero KPI card (Total Revenue) with a real period-over-period delta
// ---------------------------------------------------------------------
function DarkStatCard({ label, value, deltaPct }: { label: string; value: string; deltaPct: number | null }) {
  const up = (deltaPct ?? 0) >= 0;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "12px",
        bgcolor: "#0F172A",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 136,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "0.825rem" }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            bgcolor: "rgba(255,255,255,0.08)",
            color: "#E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CurrencyRupeeRoundedIcon fontSize="small" />
        </Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {value}
        </Typography>
        {deltaPct !== null ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
            {up ? (
              <TrendingUpRoundedIcon sx={{ fontSize: 16, color: "#4ADE80" }} />
            ) : (
              <TrendingDownRoundedIcon sx={{ fontSize: 16, color: "#F87171" }} />
            )}
            <Typography variant="caption" sx={{ color: up ? "#4ADE80" : "#F87171", fontWeight: 700 }}>
              {Math.abs(deltaPct).toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              vs previous period
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: "#64748B", mt: 1, display: "block" }}>
            All-time total
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------
// Stat Card component with interactive hover lift and accent borders
// ---------------------------------------------------------------------
function StatCard({
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
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        bgcolor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 136,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, fontSize: "0.825rem" }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
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
            color: "#0F172A",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: "#94A3B8", mt: 1, display: "block" }}>
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

function GranularityToggle({ value, onChange }: { value: Granularity; onChange: (g: Granularity) => void }) {
  return (
    <Box sx={{ display: "flex", bgcolor: "#F1F5F9", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
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
              color: active ? "#FFFFFF" : "#64748B",
              bgcolor: active ? "#0F172A" : "transparent",
              transition: "all 0.15s ease",
              "&:hover": { color: active ? "#FFFFFF" : "#0F172A" },
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
// Revenue bar chart - dark rounded bars, active period highlighted
// ---------------------------------------------------------------------
function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = hovered ?? data.length - 1;
  const width = 640;
  const height = 170;
  const chartTop = 24;
  const chartBottom = height - 28;
  const chartHeight = chartBottom - chartTop;
  const gap = data.length > 10 ? 8 : 22;
  const slotWidth = (width - gap * (data.length + 1)) / Math.max(1, data.length);
  // Bars stay slim regardless of how few periods are on screen - a single
  // wide block reads as heavy/oversized, a capped-width bar centered in
  // its slot reads as a minimal, deliberate chart no matter the count.
  const barWidth = Math.min(slotWidth, 26);
  const max = Math.max(1, ...data.map((d) => d.revenue));

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={chartBottom - chartHeight * f}
            x2={width}
            y2={chartBottom - chartHeight * f}
            stroke="#F1F5F9"
            strokeWidth={f === 0 ? 2 : 1}
          />
        ))}
        {data.map((d, i) => {
          const barHeight = d.revenue > 0 ? Math.max((d.revenue / max) * chartHeight, 6) : 0;
          const slotX = gap + i * (slotWidth + gap);
          const x = slotX + (slotWidth - barWidth) / 2;
          const y = chartBottom - barHeight;
          const active = i === activeIdx;
          return (
            <g
              key={`${d.period}-${i}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Invisible full-slot hit area, so hovering is easy to land
                  on even though the visible bar itself is drawn slim. */}
              <rect x={slotX} y={chartTop} width={slotWidth} height={chartHeight} fill="transparent" />
              {d.revenue > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(6, barWidth / 2)}
                  fill={active ? "#94A3B8" : "#0F172A"}
                  style={{ transition: "fill 0.2s ease, height 0.3s ease" }}
                />
              ) : (
                <rect x={x} y={chartBottom - 3} width={barWidth} height={3} rx={1.5} fill="#E2E8F0" />
              )}
              {active && d.revenue > 0 && (
                <text x={slotX + slotWidth / 2} y={y - 10} textAnchor="middle" fontSize="12" fontWeight={800} fill="#0F172A">
                  {money(d.revenue)}
                </text>
              )}
              <text
                x={slotX + slotWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize={data.length > 10 ? "9" : "11"}
                fontWeight={600}
                fill={active ? "#0F172A" : "#94A3B8"}
              >
                {d.period}
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
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          ))}
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: "#0F172A", lineHeight: 1 }}>{total}</Typography>
          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.65rem", mt: 0.25 }}>{centerLabel}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1, minWidth: 0 }}>
        {segments.map((s) => (
          <Box key={s.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }} noWrap>
                {s.label}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", flexShrink: 0 }}>
              {s.count}
              <Typography component="span" variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
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
  const due = getDueLabel(project.delivery_date, project.is_overdue);
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
        border: "1px solid #F1F5F9",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": {
          borderColor: "#E2E8F0",
          bgcolor: "#F8FAFC",
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
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }} noWrap>
          {project.customer_name || "Unnamed Client"}
        </Typography>
        <Typography variant="caption" sx={{ color: "#94A3B8" }} noWrap>
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
          sx={{ fontSize: 18, color: "#CBD5E1", opacity: 0, transition: "all 0.15s ease" }}
        />
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
      ? { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A", fill: "#FEF9E7" }
      : rank === 2
      ? { bg: "#F1F5F9", color: "#475569", border: "#E2E8F0", fill: "#F8FAFC" }
      : rank === 3
      ? { bg: "#FFEDD5", color: "#9A3412", border: "#FDBA74", fill: "#FFF7ED" }
      : { bg: "#F1F5F9", color: "#94A3B8", border: "#E2E8F0", fill: "#F8FAFC" };

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid #F1F5F9",
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: "#E2E8F0" },
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
            bgcolor: "#0F172A",
            color: "#FFFFFF",
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
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }} noWrap>
            {customer.customer_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {customer.order_count} {customer.order_count === 1 ? "order" : "orders"}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "0.9rem", flexShrink: 0 }}>
          {money(customer.total_spent)}
        </Typography>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Reusable Structural Card Shell
// ---------------------------------------------------------------------
function SectionCard({
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
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        bgcolor: "#FFFFFF",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
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
          <Typography sx={{ fontWeight: 700, color: "#0F172A", fontSize: "1.05rem" }}>
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
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("month");

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
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: "#DC2626", mb: 2 }} />
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

  const overdueCount = data.attention_projects.filter((p) => p.is_overdue).length;
  const urgentCount = data.attention_projects.length - overdueCount;
  const maxCustomerSpend = Math.max(1, ...data.top_customers.map((c) => c.total_spent));

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      {/* Top Header Section */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 4, gap: 2 }}>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            Real-time operations & financial performance overview
          </p>
        </div>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <GranularityToggle value={granularity} onChange={setGranularity} />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 999,
              border: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              color: "#334155",
              fontSize: "0.8rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: "#94A3B8" }} />
            {getRangeLabel(granularity)}
          </Box>
        </Box>
      </Box>

      {/* Hero Stat Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        <DarkStatCard label="Total Revenue" value={money(stats.total_revenue)} deltaPct={deltaPct} />
        <StatCard
          icon={<AssignmentRoundedIcon fontSize="small" />}
          label="Active Projects"
          value={String(stats.active_projects)}
          color="#4F46E5"
          bg="#EEF2FF"
          sub={`${stats.completed_projects} completed`}
        />
        <StatCard
          icon={<PeopleAltRoundedIcon fontSize="small" />}
          label="Total Customers"
          value={String(stats.total_customers)}
          color="#0891B2"
          bg="#ECFEFF"
        />
        <StatCard
          icon={<HourglassBottomRoundedIcon fontSize="small" />}
          label="Outstanding"
          value={money(stats.outstanding_balance)}
          color={stats.overdue_invoices > 0 ? "#DC2626" : "#D97706"}
          bg={stats.overdue_invoices > 0 ? "#FEF2F2" : "#FFFBEB"}
          sub={stats.overdue_invoices > 0 ? `${stats.overdue_invoices} overdue` : `${stats.pending_invoices} pending`}
        />
      </Box>

      {/* Revenue Chart + Calendar / Completion Row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 3,
          alignItems: "start",
          mb: 3,
        }}
      >
        <SectionCard
          icon={<TrendingUpRoundedIcon fontSize="small" />}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          title="Total Revenue"
        >
          <RevenueBarChart data={trend} />
        </SectionCard>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <SectionCard
            icon={<LocalShippingRoundedIcon fontSize="small" />}
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
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
            iconColor="#DC2626"
            iconBg="#FEF2F2"
            title="Priority Mix"
          >
            <StatusDonut
              data={data.priority_breakdown}
              colorFor={(label) => getSemanticColor("priority", label)}
              centerLabel="projects"
            />
          </SectionCard>
        </Box>
      </Box>

      {/* Action Queue + Leaderboard - elevated above the raw invoice
          table since these are the two things worth acting on first:
          what's overdue/urgent right now, and who the business's best
          customers are. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          alignItems: "start",
          mb: 3,
        }}
      >
        <SectionCard
          icon={<WarningAmberRoundedIcon fontSize="small" />}
          iconColor="#DC2626"
          iconBg="#FEF2F2"
          title="Needs Attention"
          action={
            data.attention_projects.length > 0 ? (
              <Box sx={{ display: "flex", gap: 0.75 }}>
                {overdueCount > 0 && (
                  <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "#FEF2F2", color: "#DC2626", fontSize: "0.7rem", fontWeight: 800 }}>
                    {overdueCount} overdue
                  </Box>
                )}
                {urgentCount > 0 && (
                  <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "#FFFBEB", color: "#D97706", fontSize: "0.7rem", fontWeight: 800 }}>
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
                <AttentionRow key={p.id} project={p} onClick={() => navigate(`/admin/projects/${p.id}`)} />
              ))}
            </Box>
          )}
        </SectionCard>

        <SectionCard
          icon={<EmojiEventsRoundedIcon fontSize="small" />}
          iconColor="#D97706"
          iconBg="#FFFBEB"
          title="Top Customers"
          action={
            data.top_customers.length > 0 ? (
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
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

      {/* Recent Invoices - wide table */}
      <SectionCard
        icon={<ReceiptLongRoundedIcon fontSize="small" />}
        iconColor="#059669"
        iconBg="#ECFDF5"
        title="Recent Invoices"
        sx={{ mb: 3 }}
      >
        {data.recent_invoices.length === 0 ? (
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
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                {["Invoice", "Project Type", "Date", "Amount", "Status"].map((h, i) => (
                  <Typography
                    key={h}
                    variant="caption"
                    sx={{ fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i >= 3 ? "right" : "left" }}
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
                      "&:hover": { bgcolor: "#F8FAFC" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "8px",
                          bgcolor: "#EEF2FF",
                          color: "#4F46E5",
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
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }} noWrap>
                          {inv.customer_name || "Guest Customer"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{inv.invoice_number}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: "#475569" }} noWrap>
                      {inv.project_type || "Custom Project"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#475569" }} noWrap>
                      {formatDate(inv.created_at)}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: "#0F172A", fontSize: "0.9rem", textAlign: "right" }}>
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

    </main>
  );
}
