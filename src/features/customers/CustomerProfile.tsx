import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Tab, Tabs } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../format/date";
import { getSemanticColor } from "../../utils/colors";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CustomerInvoicesList from "../billing/CustomerInvoicesList";
import CustomerQuotationsList from "../billing/CustomerQuotationsList";
import { useOnDialogClose } from "../../hooks/useOnDialogClose";
import Table from "../../ui/Table";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import PageShell from "../../ui/PageShell";
import PageSpinner from "../../ui/PageSpinner";
import ProfileHeader, { ProfileBreadcrumb } from "../../ui/ProfileHeader";
import { formatRupeesWhole as money } from "../../format/money";
import { messages } from "../../messages";
import { surfaceSx } from "../../ui/surface";

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


// Same column set as the admin Projects table (see features/projects/Projects.tsx)
// trimmed to what's relevant once already scoped to one customer - this is
// the same shared Table component used everywhere else in the app, not a
// bespoke row list, so it looks and behaves exactly like every other table
// a user already knows.
const orderColumns: GridColDef<OrderItem>[] = [
  {
    field: "project_type",
    headerName: messages.fields.projectType,
    flex: 1.2,
    minWidth: 150,
    renderCell: ({ value }) => <span style={{ fontWeight: 600 }}>{value}</span>,
  },
  {
    field: "print_status",
    headerName: messages.fields.printStatus,
    width: 140,
    renderCell: ({ value }) => (
      <Chip label={value} sx={semanticChipSx(getSemanticColor("printStatus", value))} />
    ),
  },
  {
    field: "delivery_date",
    headerName: "Delivery",
    flex: 1.4,
    minWidth: 200,
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

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"invoices" | "orders" | "quotations">("invoices");

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

  // Editing an invoice in its dialog can change the figures on this page.
  useOnDialogClose(load);

  if (loading && !data) return <PageSpinner />;

  if (error || !data) {
    return (
      <PageShell>
        <EmptyState
          icon={<WarningAmberRoundedIcon />}
          title="Customer not found"
          description="This customer may have been deleted, or the link is invalid."
          action={<Button onClick={() => navigate("/admin/customers")}>Back to Customers</Button>}
        />
      </PageShell>
    );
  }

  const { customer, stats, projects } = data;
  const fullName = `${customer.first_name} ${customer.last_name}`;

  return (
    <PageShell>
      <ProfileBreadcrumb parentLabel="Customers" onParentClick={() => navigate("/admin/customers")} current={fullName} />

      <ProfileHeader
        name={fullName}
        phone={customer.contact_number}
        email={customer.email}
        metrics={[
          { label: "Total orders", value: String(stats.total_orders) },
          { label: "Active orders", value: String(stats.active_orders), sub: "not yet delivered" },
          { label: "Total spent", value: money(stats.total_spent), sub: "paid invoices" },
          {
            label: "Outstanding",
            value: money(stats.outstanding_balance),
            sub: `${stats.pending_invoices} pending`,
            valueColor: stats.outstanding_balance > 0 ? "var(--red-600)" : undefined,
          },
        ]}
      />

      <Box component="section" sx={{ ...surfaceSx, overflow: "hidden", minWidth: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ px: 1, minHeight: 44, borderBottom: "1px solid var(--slate-100)", "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 600, fontSize: "var(--fs-sm)" } }}
        >
          <Tab value="invoices" label={`Invoices (${data.invoice_count})`} />
          <Tab value="orders" label={`Orders (${projects.length})`} />
          <Tab value="quotations" label={`Quotations (${data.quotation_count})`} />
        </Tabs>

        {tab === "invoices" && (
          <Box sx={{ p: 1.5 }}>
            <CustomerInvoicesList customerId={customer.id} showCustomerLink={false} onChanged={load} />
          </Box>
        )}
        {tab === "quotations" && (
          <Box sx={{ p: 1.5 }}>
            <CustomerQuotationsList customerId={customer.id} />
          </Box>
        )}
        {tab === "orders" &&
          (projects.length === 0 ? (
            <EmptyState title={messages.empty.orders} description="Projects for this customer will appear here." />
          ) : (
            <Table<OrderItem>
              bare
              rows={projects}
              columns={orderColumns}
              hideActionsColumn
              onRowSelect={(row) => navigate(`/admin/projects?projectId=${row.id}`)}
            />
          ))}
      </Box>
    </PageShell>
  );
}
