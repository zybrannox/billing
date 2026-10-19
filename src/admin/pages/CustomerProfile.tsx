import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../utils/dateFormatter";
import { getSemanticColor } from "../../utils/colors";
import { getInitials } from "../../utils/appSupport";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CustomerInvoicesDrawer from "../components/CustomerInvoicesDrawer";
import CustomerQuotationsDrawer from "../components/CustomerQuotationsDrawer";
import Table from "../../common/components/Table";
import { SectionCard, StatCard } from "./Dashboard";

interface CustomerData {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string | null;
}

interface CustomerStats {
  total_orders: number;
  active_orders: number;
  total_spent: number;
  outstanding_balance: number;
  pending_invoices: number;
}

interface OrderItem {
  id: number;
  project_type: string;
  priority: string;
  print_status: string;
  delivery_date: string | null;
  delivered_at: string | null;
  delivered_on_credit: boolean;
}

interface CustomerProfileData {
  customer: CustomerData;
  stats: CustomerStats;
  projects: OrderItem[];
  invoice_count: number;
  quotation_count: number;
}

const money = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// Same column set as the admin Projects table (see common/pages/Projects.tsx)
// trimmed to what's relevant once already scoped to one customer - this is
// the same shared Table component used everywhere else in the app, not a
// bespoke row list, so it looks and behaves exactly like every other table
// a user already knows.
const orderColumns: GridColDef<OrderItem>[] = [
  {
    field: "project_type",
    headerName: "Project Type",
    flex: 1.2,
    renderCell: ({ value }) => <span style={{ fontWeight: 600 }}>{value}</span>,
  },
  {
    field: "priority",
    headerName: "Priority",
    flex: 1,
    renderCell: ({ value }) => (
      <Chip label={value} sx={semanticChipSx(getSemanticColor("priority", value))} />
    ),
  },
  {
    field: "print_status",
    headerName: "Print Status",
    flex: 1,
    renderCell: ({ value }) => (
      <Chip label={value} sx={semanticChipSx(getSemanticColor("printStatus", value))} />
    ),
  },
  {
    field: "delivery_date",
    headerName: "Delivery",
    flex: 1.6,
    renderCell: ({ row }) =>
      row.delivered_on_credit ? (
        <span style={{ color: "var(--violet-600)", fontWeight: 700 }}>Delivered on Credit</span>
      ) : row.delivered_at ? (
        `Delivered ${formatDateTime(row.delivered_at)}`
      ) : (
        `Due ${formatDateTime(row.delivery_date)}`
      ),
  },
];

// Billing and Quotations aren't views of the page's own table - each opens
// a side drawer listing that customer's records - so they're buttons, not
// tabs: the icon says what it holds, the chevron says it opens a panel, and
// the button stays lit while its panel is open.
function DrawerButton({
  icon,
  label,
  count,
  color,
  open,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  color: { text: string; border: string; bg: string };
  open: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.75,
        py: 0.85,
        borderRadius: 999,
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 700,
        fontFamily: "inherit",
        flexShrink: 0,
        color: color.text,
        bgcolor: open ? color.bg : "var(--white)",
        border: `1px solid ${color.border}`,
        transition: "all 0.15s ease",
        "&:hover": { bgcolor: color.bg },
      }}
    >
      {icon}
      {label} ({count})
      <ChevronRightRoundedIcon sx={{ fontSize: 18, ml: -0.25 }} />
    </Box>
  );
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Billing and Quotations each open a right-side drawer (the same ones the
  // rest of the admin uses for a customer's records - see
  // CustomerInvoicesDrawer / CustomerQuotationsDrawer) rather than switching
  // this page's table, so those records look and behave the same wherever
  // they're opened from, and are fetched a page at a time on demand.
  const [billingOpen, setBillingOpen] = useState(false);
  const [quotationsOpen, setQuotationsOpen] = useState(false);

  const load = () => {
    setLoading(true);
    apiService
      .get<CustomerProfileData>(`/customers/${id}/profile`)
      .then((res) => {
        setData(res);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2 }}>
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body2" color="text.secondary">Loading customer profile...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen p-6 md:p-10 bg-slate-50">
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px", maxWidth: 480, mx: "auto", my: 8 }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: "var(--red-600)", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Customer not found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This customer may have been deleted, or the link is invalid.
          </Typography>
          <Box
            component="button"
            onClick={() => navigate("/admin/customers")}
            sx={{
              border: "none",
              cursor: "pointer",
              px: 3,
              py: 1.25,
              borderRadius: "10px",
              bgcolor: "var(--slate-900)",
              color: "var(--white)",
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            Back to Customers
          </Box>
        </Paper>
      </main>
    );
  }

  const { customer, stats, projects } = data;
  const fullName = `${customer.first_name} ${customer.last_name}`;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      {/* Back link */}
      <Box
        onClick={() => navigate("/admin/customers")}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          mb: 3,
          cursor: "pointer",
          color: "var(--slate-500)",
          fontWeight: 600,
          fontSize: "0.85rem",
          "&:hover": { color: "var(--slate-900)" },
        }}
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
        Back to Customers
      </Box>

      {/* Identity Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "16px",
            bgcolor: "var(--slate-900)",
            color: "var(--white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "1.35rem",
            flexShrink: 0,
          }}
        >
          {getInitials(fullName)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {fullName}
          </h1>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
              <PhoneRoundedIcon sx={{ fontSize: 15 }} />
              {customer.contact_number}
            </Box>
            {customer.email && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
                <EmailRoundedIcon sx={{ fontSize: 15 }} />
                {customer.email}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2.5,
          mb: 3,
        }}
      >
        <StatCard
          icon={<AssignmentRoundedIcon fontSize="small" />}
          label="Total Orders"
          value={String(stats.total_orders)}
          color="var(--indigo-600)"
          bg="var(--indigo-50)"
          sub={`${stats.active_orders} active`}
        />
        <StatCard
          icon={<CurrencyRupeeRoundedIcon fontSize="small" />}
          label="Total Spent"
          value={money(stats.total_spent)}
          color="var(--emerald-600)"
          bg="var(--emerald-50)"
          sub="Paid invoices"
        />
        <StatCard
          icon={<HourglassBottomRoundedIcon fontSize="small" />}
          label="Outstanding"
          value={money(stats.outstanding_balance)}
          color={stats.outstanding_balance > 0 ? "var(--red-600)" : "var(--amber-600)"}
          bg={stats.outstanding_balance > 0 ? "var(--red-50)" : "var(--amber-50)"}
          sub={`${stats.pending_invoices} pending`}
        />
        <StatCard
          icon={<LocalShippingRoundedIcon fontSize="small" />}
          label="Active Orders"
          value={String(stats.active_orders)}
          color="var(--cyan-600)"
          bg="var(--cyan-50)"
          sub="Not yet delivered"
        />
      </Box>

      {/* Orders (inline table) with Billing / Quotations drawers */}
      <SectionCard
        icon={<AssignmentRoundedIcon fontSize="small" />}
        iconColor="var(--indigo-600)"
        iconBg="var(--indigo-50)"
        title={`Orders (${projects.length})`}
        action={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <DrawerButton
              icon={<ReceiptLongRoundedIcon sx={{ fontSize: 17 }} />}
              label="Billing"
              count={data.invoice_count}
              color={{ text: "var(--emerald-700)", border: "var(--emerald-200)", bg: "var(--emerald-50)" }}
              open={billingOpen}
              onClick={() => setBillingOpen(true)}
            />
            <DrawerButton
              icon={<RequestQuoteRoundedIcon sx={{ fontSize: 17 }} />}
              label="Quotations"
              count={data.quotation_count}
              color={{ text: "var(--violet-600)", border: "var(--violet-200)", bg: "var(--violet-50)" }}
              open={quotationsOpen}
              onClick={() => setQuotationsOpen(true)}
            />
          </Box>
        }
      >
        {projects.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No orders placed yet.
          </Typography>
        ) : (
          <Table<OrderItem>
            rows={projects}
            columns={orderColumns}
            hideActionsColumn
            onRowSelect={(row) => navigate(`/admin/projects?projectId=${row.id}`)}
          />
        )}
      </SectionCard>

      <CustomerInvoicesDrawer
        customer={billingOpen ? customer : null}
        showCustomerLink={false}
        onClose={() => {
          setBillingOpen(false);
          // A payment, mark-paid or cancel inside the drawer changes this
          // page's balance cards and counts - refresh them (the page stays
          // rendered while this reloads).
          load();
        }}
      />

      <CustomerQuotationsDrawer
        customer={quotationsOpen ? customer : null}
        onClose={() => setQuotationsOpen(false)}
      />
    </main>
  );
}
