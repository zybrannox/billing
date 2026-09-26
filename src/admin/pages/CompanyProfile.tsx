import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { apiService } from "../../api/service";
import { getInitials } from "../../utils/appSupport";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import Table from "../../common/components/Table";
import CompanyInvoicesList from "../components/CompanyInvoicesList";
import { SectionCard, StatCard } from "./Dashboard";

interface CompanyData {
  id: number;
  name: string;
  billing_email: string | null;
  phone: string | null;
  payment_terms_days: number;
  credit_limit: number | null;
}

interface CompanyStats {
  total_contacts: number;
  total_orders: number;
  active_orders: number;
  total_spent: number;
  outstanding_balance: number;
  total_invoices: number;
  pending_invoices: number;
}

interface ContactItem {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string | null;
  payment_status?: "paid" | "pending" | "no_invoices" | null;
  outstanding_balance?: number | null;
}

interface CompanyProfileData {
  company: CompanyData;
  stats: CompanyStats;
  contacts: ContactItem[];
}

const money = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PAYMENT_STATUS_META: Record<string, { color: string; label: string }> = {
  paid: { color: "var(--green-600)", label: "Paid" },
  pending: { color: "var(--amber-600)", label: "Pending" },
  no_invoices: { color: "var(--slate-500)", label: "No Invoices" },
};

// Same column set as Customers.tsx's own base columns, trimmed to what's
// relevant once already scoped to one company's contacts.
const contactColumns: GridColDef<ContactItem>[] = [
  { field: "first_name", headerName: "First Name", flex: 1 },
  { field: "last_name", headerName: "Last Name", flex: 1 },
  { field: "contact_number", headerName: "Contact Number", flex: 1 },
  { field: "email", headerName: "Email", flex: 1.3 },
  {
    field: "payment_status",
    headerName: "Payment Status",
    flex: 1.2,
    sortable: false,
    renderCell: ({ row }) => {
      const meta = PAYMENT_STATUS_META[row.payment_status ?? "no_invoices"] ?? PAYMENT_STATUS_META.no_invoices;
      return <Chip label={meta.label} sx={semanticChipSx(meta.color)} />;
    },
  },
];

// Same visual language as CustomerProfile.tsx's ProfileTabToggle - kept as
// its own local copy since the two pages' tabs are different value sets,
// matching this codebase's existing pattern of page-local presentational
// pill switchers.
function ProfileTabToggle({
  value,
  onChange,
  counts,
}: {
  value: "contacts" | "billing";
  onChange: (v: "contacts" | "billing") => void;
  counts: Record<"contacts" | "billing", number>;
}) {
  const tabs: { value: "contacts" | "billing"; label: string }[] = [
    { value: "contacts", label: "Contacts" },
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

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<CompanyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Lets a caller land directly on a specific tab (e.g. CompanyInvoicesList's
  // "View Full Billing History" linking to ?tab=billing) instead of always
  // opening on Contacts.
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<"contacts" | "billing">(initialTab === "billing" ? "billing" : "contacts");

  const load = () => {
    setLoading(true);
    apiService
      .get<CompanyProfileData>(`/companies/${id}/profile`)
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
        <Typography variant="body2" color="text.secondary">Loading company profile...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen p-6 md:p-10 bg-slate-50">
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px", maxWidth: 480, mx: "auto", my: 8 }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: "var(--red-600)", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Company not found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This company may have been deleted, or the link is invalid.
          </Typography>
          <Box
            component="button"
            onClick={() => navigate("/admin/companies")}
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
            Back to Companies
          </Box>
        </Paper>
      </main>
    );
  }

  const { company, stats, contacts } = data;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      {/* Back link */}
      <Box
        onClick={() => navigate("/admin/companies")}
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
        Back to Companies
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
          {getInitials(company.name)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {company.name}
          </h1>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 0.5 }}>
            {company.phone && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
                <PhoneRoundedIcon sx={{ fontSize: 15 }} />
                {company.phone}
              </Box>
            )}
            {company.billing_email && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
                <EmailRoundedIcon sx={{ fontSize: 15 }} />
                {company.billing_email}
              </Box>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
              {company.payment_terms_days > 0 ? `NET-${company.payment_terms_days} terms` : "Due on receipt"}
            </Box>
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
          icon={<PeopleAltRoundedIcon fontSize="small" />}
          label="Total Contacts"
          value={String(stats.total_contacts)}
          color="var(--indigo-600)"
          bg="var(--indigo-50)"
          sub={`${stats.total_orders} total orders`}
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
          // Display-only credit visibility - not enforced anywhere at
          // invoice-creation time (see app/invoices/repository.py's
          // create_invoice), just surfaced here so the admin can see it.
          sub={company.credit_limit != null ? `of ${money(company.credit_limit)} limit` : `${stats.pending_invoices} pending`}
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

      {/* Contacts / Billing */}
      <SectionCard
        icon={tab === "contacts" ? <PeopleAltRoundedIcon fontSize="small" /> : <ReceiptLongRoundedIcon fontSize="small" />}
        iconColor={tab === "contacts" ? "var(--indigo-600)" : "var(--emerald-600)"}
        iconBg={tab === "contacts" ? "var(--indigo-50)" : "var(--emerald-50)"}
        title={company.name}
        action={
          <ProfileTabToggle
            value={tab}
            onChange={setTab}
            counts={{ contacts: contacts.length, billing: stats.total_invoices }}
          />
        }
      >
        {tab === "contacts" ? (
          contacts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No contacts yet - add or assign a customer to this company from the Customers list.
            </Typography>
          ) : (
            <Table<ContactItem>
              rows={contacts}
              columns={contactColumns}
              hideActionsColumn
              onRowSelect={(row) => navigate(`/admin/customers/${row.id}`)}
            />
          )
        ) : (
          <CompanyInvoicesList companyId={Number(id)} mode="full" />
        )}
      </SectionCard>
    </main>
  );
}
