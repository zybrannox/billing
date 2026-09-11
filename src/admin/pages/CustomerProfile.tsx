import { useEffect, useState } from "react";
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
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../utils/dateFormatter";
import { getSemanticColor } from "../../utils/colors";
import { getInitials } from "../../utils/appSupport";
import { useInvoiceStore } from "../../store/useInvoiceStore";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CrudActions from "../../ui/Actions";
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

interface BillingItem {
  id: number;
  invoice_number: string;
  project_type: string | null;
  amount: number;
  balance_due: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
}

interface CustomerProfileData {
  customer: CustomerData;
  stats: CustomerStats;
  projects: OrderItem[];
  invoices: BillingItem[];
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

// Same column set (and semantic status-color mapping) as the removed
// standalone Billing page (see admin/pages/Billing.tsx, before it was
// folded into this profile) - Customer is dropped since every row here is
// already this one customer's own invoice.
const billingColumns: GridColDef<BillingItem>[] = [
  { field: "invoice_number", headerName: "Invoice #", flex: 1 },
  {
    field: "project_type",
    headerName: "Project",
    flex: 1,
    valueFormatter: (value: string | null) => value || "—",
  },
  {
    field: "amount",
    headerName: "Amount",
    flex: 1,
    valueFormatter: (value: number) => `₹${value?.toLocaleString()}`,
  },
  {
    field: "balance_due",
    headerName: "Balance Due",
    flex: 1,
    renderCell: ({ value, row }) => (
      <span style={{ fontWeight: value > 0 ? 700 : 500, color: value > 0 ? "var(--amber-700)" : "var(--slate-500)" }}>
        {row.status === "cancelled" ? "—" : `₹${(value ?? 0).toLocaleString()}`}
      </span>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    renderCell: ({ value }) => (
      <Chip
        label={value}
        sx={semanticChipSx(
          getSemanticColor(
            "printStatus",
            value === "paid" ? "Completed" : value === "pending" ? "In Progress" : "Delayed",
          ),
        )}
      />
    ),
  },
  {
    field: "created_at",
    headerName: "Date",
    flex: 1.5,
    valueFormatter: (value) => formatDateTime(value),
  },
];

// Same pill-switcher visual language as the Dashboard's own Recent
// Activity toggle (see admin/pages/Dashboard.tsx's ActivityTabToggle) -
// kept as its own local copy rather than a shared import since the two
// pages' tabs are different value sets, matching this codebase's existing
// pattern of page-local presentational components.
function ProfileTabToggle({
  value,
  onChange,
  counts,
}: {
  value: "orders" | "billing";
  onChange: (v: "orders" | "billing") => void;
  counts: Record<"orders" | "billing", number>;
}) {
  const tabs: { value: "orders" | "billing"; label: string }[] = [
    { value: "orders", label: "Orders" },
    { value: "billing", label: "Billing" },
  ];
  return (
    <Box sx={{ display: "flex", bgcolor: "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Box
            key={t.value}
            component="button"
            onClick={() => onChange(t.value)}
            sx={{
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
            {t.label} ({counts[t.value]})
          </Box>
        );
      })}
    </Box>
  );
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateInvoice } = useInvoiceStore();
  const [data, setData] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"orders" | "billing">("orders");

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

  const handleMarkPaid = async (invoiceId: number) => {
    await updateInvoice(invoiceId, { status: "paid" });
    load();
  };

  const handleCancel = async (invoiceId: number) => {
    await updateInvoice(invoiceId, { status: "cancelled" });
    load();
  };

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

  const { customer, stats, projects, invoices } = data;
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

      {/* Orders / Billing */}
      <SectionCard
        icon={tab === "orders" ? <AssignmentRoundedIcon fontSize="small" /> : <ReceiptLongRoundedIcon fontSize="small" />}
        iconColor={tab === "orders" ? "var(--indigo-600)" : "var(--emerald-600)"}
        iconBg={tab === "orders" ? "var(--indigo-50)" : "var(--emerald-50)"}
        title={fullName}
        action={
          <ProfileTabToggle
            value={tab}
            onChange={setTab}
            counts={{ orders: projects.length, billing: invoices.length }}
          />
        }
      >
        {tab === "orders" ? (
          projects.length === 0 ? (
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
          )
        ) : invoices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No invoices raised yet.
          </Typography>
        ) : (
          <Table<BillingItem>
            rows={invoices}
            columns={billingColumns}
            renderActions={(params) => [
              <CrudActions
                key="crud"
                viewInvoice
                markPaid
                cancelInvoice
                invoiceStatus={params.row.status}
                onViewInvoice={() => navigate(`/admin/invoices/${params.row.id}`)}
                onMarkPaid={() => handleMarkPaid(params.row.id)}
                onCancelInvoice={() => handleCancel(params.row.id)}
              />,
            ]}
          />
        )}
      </SectionCard>
    </main>
  );
}
