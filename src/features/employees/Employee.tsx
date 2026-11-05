import type { GridColDef, GridRowId } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { Box, Tooltip } from "@mui/material";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import { useApiRequest } from "../../hooks/useApiRequest";
import { API } from "../../api/endpoints";
import { apiService } from "../../api/service";
import { useEffect, useMemo, useState } from "react";
import CrudActions from "../../ui/Actions";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { SemanticSelectEditCell } from "../../ui/Select";
import Button from "../../ui/Button";
import { useDialogStore } from "../../store/useDialogStore";
import AddEmployee from "./AddEmployee";
import ChangePassword from "../auth/ChangePassword";
import Dialog from "../../ui/Dialog";
import Table from "../../ui/Table";
import TableSearchBar from "../../ui/TableSearchBar";
import { useTableSearch } from "../../hooks/useTableSearch";
import EmptyState from "../../ui/EmptyState";
import FilterPill from "../../ui/FilterPill";
import InitialsAvatar from "../../ui/InitialsAvatar";
import PageHeader from "../../ui/PageHeader";
import PageShell from "../../ui/PageShell";
import TableCard from "../../ui/TableCard";
import { accessNames, accessSummary } from "./accessOptions";

interface Employee {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  permissions?: string[];
}

type StatusFilter = "all" | "Active" | "InActive";

// The grid row carries a plain "status" string field (mirroring the pattern
// used for print_status/priority elsewhere) instead of running is_active's
// boolean through a valueGetter/valueSetter pair - MUI's row-edit-mode
// commit does not reliably re-merge a valueSetter's spread of `params.row`
// with the rest of the row's edited fields, which silently dropped every
// other field (and the id) from processRowUpdate's newRow.
type EmployeeRow = Employee & { status: "Active" | "InActive" };

const columns: GridColDef[] = [
  {
    field: "username",
    headerName: "Name",
    flex: 1.5,
    minWidth: 180,
    editable: true,
    renderCell: ({ value }) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "100%", minWidth: 0 }}>
        <InitialsAvatar name={value} />
        <Box component="span" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </Box>
      </Box>
    ),
  },
  {
    field: "email",
    headerName: "Email",
    flex: 1.8,
    minWidth: 200,
    editable: true,
    renderCell: ({ value }) => <Box component="span" sx={{ color: "var(--slate-600)" }}>{value}</Box>,
  },
  {
    field: "phone",
    headerName: "Phone",
    width: 130,
    editable: true,
    renderCell: ({ value }) => <Box component="span" sx={{ color: "var(--slate-600)" }}>{value}</Box>,
  },
  {
    field: "role",
    headerName: "Role",
    width: 110,
    editable: true,
    renderCell: ({ value }) => (
      <Box component="span" sx={{ color: "var(--slate-600)", textTransform: "capitalize" }}>{value}</Box>
    ),
  },
  {
    field: "permissions",
    headerName: "Access",
    width: 120,
    sortable: false,
    renderCell: ({ value }) => {
      const summary = accessSummary(value);
      return (
        <Tooltip title={accessNames(value)}>
          <Box component="span" sx={{ fontWeight: 500, color: summary === "None" ? "var(--slate-400)" : "var(--slate-700)" }}>
            {summary}
          </Box>
        </Tooltip>
      );
    },
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    editable: true,
    type: "singleSelect",
    valueOptions: ["Active", "InActive"],

    renderCell: ({ value }) => (
      <Chip
        label={value === "InActive" ? "Inactive" : value}
        sx={semanticChipSx(getSemanticColor("status", value))}
      />
    ),

    renderEditCell: (params) => (
      <SemanticSelectEditCell {...params} semantic="priority" />
    ),
  },
];

const Employee = () => {
  const navigate = useNavigate();
  const { openDialog } = useDialogStore();
  const { sendRequest, loading } = useApiRequest();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchEmployees = async () => {
    await sendRequest({
      endpoint: API.users.list,
      method: "get",
      onSuccess: (res: Employee[]) => {
        setEmployees(res);
        setLoadFailed(false);
      },
      onError: (err) => {
        console.error("Error fetching employees", err);
        setLoadFailed(true);
      },
    });
    setLoaded(true);
  };

  // Once on mount - sendRequest (useApiRequest) isn't memoized, so listing
  // fetchEmployees as a dependency would refetch on every render.
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admins are managed separately and shouldn't clutter the employee list.
  const nonAdminEmployees: EmployeeRow[] = useMemo(
    () =>
      employees
        .filter((e) => e.role !== "admin")
        .map((e) => ({ ...e, status: e.is_active ? "Active" : "InActive" })),
    [employees],
  );

  const activeCount = nonAdminEmployees.filter((e) => e.status === "Active").length;
  const visibleEmployees = useMemo(
    () => (statusFilter === "all" ? nonAdminEmployees : nonAdminEmployees.filter((e) => e.status === statusFilter)),
    [nonAdminEmployees, statusFilter],
  );

  const { query, setQuery, filteredRows } = useTableSearch(
    visibleEmployees,
    ["username", "email", "phone", "role"],
  );

  const handleDeleteEmployee = async (id: GridRowId) => {
    await sendRequest({
      endpoint: API.users.detail(String(id)),
      method: "delete",
      onSuccess: () => {
        setEmployees((prev) => prev.filter((e) => e.id !== Number(id)));
      },
      onError: (err) => {
        console.error("Error deleting employee", err);
      },
    });
  };

  const processRowUpdate = async (newRow: EmployeeRow, oldRow: EmployeeRow) => {
    const is_active = newRow.status === "Active";
    const payload: Partial<Employee> = {
      username: newRow.username,
      email: newRow.email,
      phone: newRow.phone,
      role: newRow.role,
      is_active,
    };

    const hasChanges = (Object.keys(payload) as (keyof Employee)[]).some(
      (key) => payload[key] !== (oldRow as Employee)[key],
    );

    if (!hasChanges) return oldRow;

    const updated = await apiService.put<Employee>(
      API.users.detail(String(newRow.id)),
      payload,
    );
    setEmployees((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    return { ...updated, status: updated.is_active ? "Active" : "InActive" } as EmployeeRow;
  };

  const [passwordTargetId, setPasswordTargetId] = useState<number | null>(
    null,
  );

  const handleChangePassword = (id: GridRowId) => {
    setPasswordTargetId(Number(id));
    openDialog("changePassword", id, "edit");
  };

  return (
    <PageShell>
      <PageHeader
        title="Employees"
        description="Your team, and what each person can do."
        action={<Button onClick={() => openDialog("user")}>+ Add Employee</Button>}
      />

      <TableCard
        toolbar={
          <>
          <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto" }}>
            <FilterPill label="All" count={nonAdminEmployees.length} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <FilterPill label="Active" count={activeCount} active={statusFilter === "Active"} onClick={() => setStatusFilter("Active")} />
            <FilterPill
              label="Inactive"
              count={nonAdminEmployees.length - activeCount}
              active={statusFilter === "InActive"}
              onClick={() => setStatusFilter("InActive")}
            />
          </Box>
          <TableSearchBar value={query} onChange={setQuery} placeholder="Search employees..." sx={{ width: { xs: "100%", sm: 260 } }} />
          </>
        }
      >
        {loaded && filteredRows.length === 0 ? (
          <EmptyState
            icon={<BadgeRoundedIcon />}
            title={
              loadFailed
                ? "Couldn't load your employees"
                : nonAdminEmployees.length === 0
                  ? "No employees yet"
                  : "No employees match"
            }
            description={
              loadFailed
                ? "Check your connection and refresh the page."
                : nonAdminEmployees.length === 0
                  ? "Add your first employee to assign work and give them access."
                  : "Try a different search or filter."
            }
          />
        ) : (
          <Table<EmployeeRow>
            bare
            rows={filteredRows}
            columns={columns}
            loading={loading}
            processRowUpdate={processRowUpdate}
            onDelete={handleDeleteEmployee}
            onRowSelect={(row) => navigate(`/admin/employees/${row.id}`)}
            renderActions={(params, handlers) => [
              <CrudActions
                key="crud"
                edit
                delete
                changePassword
                onEdit={handlers.edit}
                onDelete={handlers.delete}
                onChangePassword={() => handleChangePassword(params.id)}
              />,
            ]}
          />
        )}
      </TableCard>

      <Dialog
        type="user"
        title="Employee"
        children={<AddEmployee onSuccess={fetchEmployees} />}
        maxWidth="md"
      />
      <Dialog
        type="changePassword"
        title="Password"
        maxWidth="xs"
        children={
          passwordTargetId !== null ? (
            <ChangePassword userId={passwordTargetId} />
          ) : null
        }
      />
    </PageShell>
  );
};

export default Employee;
