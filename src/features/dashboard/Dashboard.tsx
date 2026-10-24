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
import { apiService } from "../../api/service";
import { getSemanticColor } from "../../utils/colors";
import { useAppStore } from "../../store/useAppStore";
import { useDialogStore } from "../../store/useDialogStore";
import { formatRupeesWhole as money } from "../../format/money";
import { messages } from "../../messages";
import { StatCard } from "../../ui/StatCard";
import { SectionCard } from "../../ui/SectionCard";
import { RevenueAreaChart, StatusDonut } from "./Charts";
import { AttentionRow, CustomerLeaderboardRow, DeliveryRow, InvoiceRow } from "./Rows";
import { ActivityTabToggle, GranularityToggle } from "./Toggles";
import { getGreeting, getRangeLabel } from "./helpers";
import { type DashboardSummary, type Granularity } from "./types";

// ---------------------------------------------------------------------
// Main Dashboard View Component
// ---------------------------------------------------------------------
// Lists inside cards scroll past this height instead of stretching the page.
const LIST_MAX_HEIGHT = 420;

export default function Dashboard() {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const username = useAppStore((s) => s.user?.username);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [activityTab, setActivityTab] = useState<"invoices" | "deliveries">("invoices");

  // Extracted so the effect below doesn't call setLoading synchronously at
  // its own top level (react-hooks/set-state-in-effect) - same "named load
  // function" pattern used elsewhere in this app (CompanyProfile.tsx,
  // CustomerInvoicesList.tsx).
  const load = () => {
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
  };

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // What the % badge below is actually comparing (the trend's last bucket
  // vs. the one before it, at whatever granularity is selected) - it used
  // to sit under stats.total_revenue (the lifetime total), which can't
  // meaningfully move "X% vs previous period" the way one period's
  // revenue can, so the badge was describing a completely different
  // number than the one it was pinned under.
  const PERIOD_NOUN: Record<Granularity, string> = { day: "today", week: "this week", month: "this month", year: "this year" };

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
          the login page's hero panel (see features/auth/
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
            <Typography sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 700, fontSize: "var(--fs-md)" }}>
              {getGreeting()}{username ? `, ${username}` : ""}
            </Typography>
            {/* component="h1" - this is the page's real heading (the
                greeting above it is more of a label), not just large bold
                text; a plain Typography defaults to rendering as a <p>,
                which reads wrong to a screen reader. It uses no `variant`
                though (so it keeps this card's own custom sizing rather
                than MUI's preset h1 scale), which means the theme's
                per-variant heading fontFamily (see layouts/AdminLayout.tsx)
                never applies here - set directly instead of relying on
                that cascade. */}
            <Typography component="h1" sx={{ color: "var(--white)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.75rem" }, lineHeight: 1.05, mt: 1.5, m: 0 }}>
              {money(lastRevenue)}
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
                {deltaPct !== null ? "vs previous period" : "No prior period data"} · Revenue {PERIOD_NOUN[granularity]}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 500, display: "block", mt: 0.75 }}>
              All-time revenue: {money(stats.total_revenue)}
            </Typography>
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
                fontSize: "var(--fs-sm)",
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

      {/* Lower dashboard: three rows of two cards on one grid, so every card
          has a neighbour of the same height. How the workload is split comes
          first (print status, priority), then trend + leaderboard, then the
          two things to act on (lists capped and scrolling inside the card
          rather than stretching the page). */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, minWidth: 0 }}>
        {/* Row 1: how the workload is split */}
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" }, alignItems: "stretch" }}>
          <SectionCard
            icon={<LocalShippingRoundedIcon fontSize="small" />}
            iconColor="var(--indigo-600)"
            iconBg="var(--indigo-50)"
            title={messages.fields.printStatus}
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

        </Box>

        {/* Row 2: trend + leaderboard */}
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, alignItems: "stretch" }}>
          <SectionCard
            icon={<TrendingUpRoundedIcon fontSize="small" />}
            iconColor="var(--blue-600)"
            iconBg="var(--blue-50)"
            title="Revenue Trend"
          >
            <RevenueAreaChart data={trend} />
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

        {/* Row 3: the things to act on */}
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" }, alignItems: "stretch" }}>
          <SectionCard
            icon={<WarningAmberRoundedIcon fontSize="small" />}
            iconColor="var(--red-600)"
            iconBg="var(--red-50)"
            title="Needs Attention"
            action={
              data.attention_projects.length > 0 ? (
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  {creditUnpaidCount > 0 && (
                    <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "var(--violet-50)", color: "var(--violet-600)", fontSize: "var(--fs-2xs)", fontWeight: 800 }}>
                      {creditUnpaidCount} on credit
                    </Box>
                  )}
                  {overdueCount > 0 && (
                    <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "var(--red-50)", color: "var(--red-600)", fontSize: "var(--fs-2xs)", fontWeight: 800 }}>
                      {overdueCount} overdue
                    </Box>
                  )}
                  {urgentCount > 0 && (
                    <Box sx={{ px: 1.1, py: 0.35, borderRadius: 999, bgcolor: "var(--amber-50)", color: "var(--amber-600)", fontSize: "var(--fs-2xs)", fontWeight: 800 }}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: LIST_MAX_HEIGHT, overflowY: "auto", pr: 0.5 }}>
                {data.attention_projects.map((p) => (
                  <AttentionRow key={p.id} project={p} onClick={() => navigate(`/admin/projects?projectId=${p.id}`)} />
                ))}
              </Box>
            )}
          </SectionCard>

          {/* Recent Activity - invoices and deliveries in one tabbed card
              (deliveries also have the topbar bell, so they don't need a
              permanent section of their own). */}
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: LIST_MAX_HEIGHT, overflowY: "auto", pr: 0.5 }}>
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: LIST_MAX_HEIGHT, overflowY: "auto", pr: 0.5 }}>
                {data.recent_invoices.map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} onClick={() => openDialog("viewInvoice", inv.id, "view")} />
                ))}
              </Box>
            )}
          </SectionCard>
        </Box>
      </Box>
    </main>
  );
}
