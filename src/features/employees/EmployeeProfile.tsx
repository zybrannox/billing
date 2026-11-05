import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { apiService } from "../../api/service";
import { formatDateTime } from "../../format/date";
import { getSemanticColor } from "../../utils/colors";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import Table from "../../ui/Table";
import EmptyState from "../../ui/EmptyState";
import PageShell from "../../ui/PageShell";
import PageSpinner from "../../ui/PageSpinner";
import ProfileHeader, { ProfileBreadcrumb } from "../../ui/ProfileHeader";
import Panel from "../../ui/Panel";
import Button from "../../ui/Button";
import EmployeeAccessPanel from "./EmployeeAccessPanel";
import { messages } from "../../messages";

interface EmployeeData {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  permissions?: string[];
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

// Same column set as the admin Projects table (see features/projects/Projects.tsx)
// - this is the same shared Table component used everywhere else in the
// app, not a bespoke row list, so an employee's work list looks and
// behaves exactly like every other table a user already knows.
const assignedProjectColumns: GridColDef<AssignedProject>[] = [
  {
    field: "project_type",
    headerName: messages.fields.projectType,
    flex: 1,
    minWidth: 140,
    renderCell: ({ value }) => <span style={{ fontWeight: 600 }}>{value}</span>,
  },
  {
    field: "customer_name",
    headerName: "Customer",
    flex: 1,
    minWidth: 130,
    renderCell: ({ value }) => value || "—",
  },
  {
    field: "print_status",
    headerName: messages.fields.printStatus,
    width: 130,
    renderCell: ({ value }) => (
      <Chip label={value} sx={semanticChipSx(getSemanticColor("printStatus", value))} />
    ),
  },
  {
    field: "delivery_date",
    headerName: "Delivery",
    flex: 1.4,
    minWidth: 190,
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

  if (loading && !data) return <PageSpinner />;

  if (error || !data) {
    return (
      <PageShell>
        <EmptyState
          icon={<WarningAmberRoundedIcon />}
          title="Employee not found"
          description="This employee may have been removed, or the link is invalid."
          action={<Button onClick={() => navigate("/admin/employees")}>Back to Employees</Button>}
        />
      </PageShell>
    );
  }

  const { user, stats, projects } = data;
  const statusStyle = getSemanticColor("status", user.is_active ? "Active" : "InActive");

  return (
    <PageShell>
      <ProfileBreadcrumb parentLabel="Employees" onParentClick={() => navigate("/admin/employees")} current={user.username} />

      <ProfileHeader
        name={user.username}
        phone={user.phone}
        email={user.email}
        badges={
          <>
            <Chip label={user.is_active ? "Active" : "Inactive"} sx={semanticChipSx(statusStyle)} />
            <Typography sx={{ fontSize: "var(--fs-sm)", color: "var(--slate-500)", textTransform: "capitalize" }}>{user.role}</Typography>
          </>
        }
        metrics={[
          { label: "Assigned projects", value: String(stats.total_assigned), sub: `${stats.active_assigned} active` },
          { label: "Designs completed", value: String(stats.designs_completed) },
          { label: "Prints completed", value: String(stats.prints_completed) },
          { label: "Deliveries completed", value: String(stats.deliveries_completed) },
        ]}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 360px" },
          alignItems: "start",
          gap: 2,
        }}
      >
        <Panel
          flush
          title="Assigned projects"
          action={
            <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>{projects.length} total</Typography>
          }
          sx={{ order: { xs: 2, lg: 1 } }}
        >
          {projects.length === 0 ? (
            <EmptyState title="No projects assigned yet" description="Work assigned to this employee will appear here." />
          ) : (
            <Table<AssignedProject>
              bare
              rows={projects}
              columns={assignedProjectColumns}
              hideActionsColumn
              onRowSelect={(row) => navigate(`/admin/projects?projectId=${row.id}`)}
            />
          )}
        </Panel>
        <Box sx={{ order: { xs: 1, lg: 2 }, minWidth: 0 }}>
          <EmployeeAccessPanel key={user.id} userId={user.id} role={user.role} permissions={user.permissions ?? []} />
        </Box>
      </Box>
    </PageShell>
  );
}
