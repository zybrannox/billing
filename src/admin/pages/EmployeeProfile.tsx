import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import DesignServicesRoundedIcon from "@mui/icons-material/DesignServicesRounded";
import LocalPrintshopRoundedIcon from "@mui/icons-material/LocalPrintshopRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../utils/dateFormatter";
import { getSemanticColor } from "../../utils/colors";
import { getInitials } from "../../utils/appSupport";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import Table from "../../common/components/Table";
import { SectionCard, StatCard } from "./Dashboard";

interface EmployeeData {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
}

interface EmployeeStats {
  total_assigned: number;
  active_assigned: number;
  designs_completed: number;
  prints_completed: number;
  deliveries_completed: number;
}

interface AssignedProject {
  id: number;
  project_type: string;
  customer_name: string | null;
  priority: string;
  print_status: string;
  delivery_date: string | null;
  delivered_at: string | null;
  delivered_on_credit: boolean;
}

interface EmployeeProfileData {
  user: EmployeeData;
  stats: EmployeeStats;
  projects: AssignedProject[];
}

// Same column set as the admin Projects table (see common/pages/Projects.tsx)
// - this is the same shared Table component used everywhere else in the
// app, not a bespoke row list, so an employee's work list looks and
// behaves exactly like every other table a user already knows.
const assignedProjectColumns: GridColDef<AssignedProject>[] = [
  {
    field: "project_type",
    headerName: "Project Type",
    flex: 1,
    renderCell: ({ value }) => <span style={{ fontWeight: 600 }}>{value}</span>,
  },
  {
    field: "customer_name",
    headerName: "Customer",
    flex: 1,
    renderCell: ({ value }) => value || "—",
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

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    apiService
      .get<EmployeeProfileData>(`/users/${id}/profile`)
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
        <Typography variant="body2" color="text.secondary">Loading employee profile...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen p-6 md:p-10 bg-slate-50">
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: "12px", maxWidth: 480, mx: "auto", my: 8 }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 48, color: "var(--red-600)", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Employee not found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This employee may have been removed, or the link is invalid.
          </Typography>
          <Box
            component="button"
            onClick={() => navigate("/admin/employees")}
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
            Back to Employees
          </Box>
        </Paper>
      </main>
    );
  }

  const { user, stats, projects } = data;
  const statusStyle = getSemanticColor("status", user.is_active ? "Active" : "InActive");

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50/50">
      {/* Back link */}
      <Box
        onClick={() => navigate("/admin/employees")}
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
        Back to Employees
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
          {getInitials(user.username)}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.25 }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {user.username}
            </h1>
            <Chip label={user.is_active ? "Active" : "Inactive"} sx={semanticChipSx(statusStyle)} />
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
              <PhoneRoundedIcon sx={{ fontSize: 15 }} />
              {user.phone}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "var(--slate-500)", fontSize: "0.85rem", fontWeight: 500 }}>
              <EmailRoundedIcon sx={{ fontSize: 15 }} />
              {user.email}
            </Box>
            <Typography variant="caption" sx={{ color: "var(--slate-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {user.role}
            </Typography>
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
          label="Total Assigned"
          value={String(stats.total_assigned)}
          color="var(--indigo-600)"
          bg="var(--indigo-50)"
          sub={`${stats.active_assigned} active`}
        />
        <StatCard
          icon={<DesignServicesRoundedIcon fontSize="small" />}
          label="Designs Completed"
          value={String(stats.designs_completed)}
          color="var(--cyan-600)"
          bg="var(--cyan-50)"
        />
        <StatCard
          icon={<LocalPrintshopRoundedIcon fontSize="small" />}
          label="Prints Completed"
          value={String(stats.prints_completed)}
          color="var(--amber-600)"
          bg="var(--amber-50)"
        />
        <StatCard
          icon={<LocalShippingRoundedIcon fontSize="small" />}
          label="Deliveries Completed"
          value={String(stats.deliveries_completed)}
          color="var(--emerald-600)"
          bg="var(--emerald-50)"
        />
      </Box>

      {/* Assigned Work */}
      <SectionCard
        icon={<AssignmentRoundedIcon fontSize="small" />}
        iconColor="var(--indigo-600)"
        iconBg="var(--indigo-50)"
        title="Assigned Projects"
        action={
          <Typography variant="caption" sx={{ color: "var(--slate-400)", fontWeight: 600 }}>
            {projects.length} total
          </Typography>
        }
      >
        {projects.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No projects assigned yet.
          </Typography>
        ) : (
          <Table<AssignedProject>
            rows={projects}
            columns={assignedProjectColumns}
            hideActionsColumn
            onRowSelect={(row) => navigate(`/admin/projects?projectId=${row.id}`)}
          />
        )}
      </SectionCard>
    </main>
  );
}
