import type { GridColDef, GridRowId } from "@mui/x-data-grid";
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
import ChangePassword from "./ChangePassword";
import Dialog from "../../ui/Dialog";
import Table from "../../common/components/Table";
import TableSearchBar from "../../common/components/TableSearchBar";
import { useTableSearch } from "../../hooks/useTableSearch";

interface Employee {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
}

// The grid row carries a plain "status" string field (mirroring the pattern
// used for print_status/priority elsewhere) instead of running is_active's
// boolean through a valueGetter/valueSetter pair - MUI's row-edit-mode
// commit does not reliably re-merge a valueSetter's spread of `params.row`
// with the rest of the row's edited fields, which silently dropped every
// other field (and the id) from processRowUpdate's newRow.
type EmployeeRow = Employee & { status: "Active" | "InActive" };

const baseColumns: GridColDef[] = [
  {
    field: "username",
    headerName: "User Name",
    flex: 2,
    editable: true,
  },
  { field: "email", headerName: "Email", flex: 2, editable: true },
  {
    field: "phone",
    headerName: "Phone",
    flex: 1,
    editable: true,
  },
  {
    field: "role",
    headerName: "Role",
    flex: 1,
    editable: true,
  },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    editable: true,
    type: "singleSelect",
    valueOptions: ["Active", "InActive"],

    renderCell: ({ value }) => (
      <Chip
        label={value}
        sx={semanticChipSx(getSemanticColor("priority", value))}
      />
    ),

    renderEditCell: (params) => (
      <SemanticSelectEditCell {...params} semantic="priority" />
    ),
  },
];

const Employee = () => {
  const { openDialog } = useDialogStore();
  const { sendRequest } = useApiRequest();
  const [employees, setEmployees] = useState<Employee[]>([]);

  const fetchEmployees = async () => {
    await sendRequest({
      endpoint: "/users/",
      method: "get",
      onSuccess: (res: Employee[]) => {
        setEmployees(res);
      },
      onError: (err) => {
        console.error("Error fetching employees", err);
      },
    });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Admins are managed separately and shouldn't clutter the employee list.
  const nonAdminEmployees: EmployeeRow[] = useMemo(
    () =>
      employees
        .filter((e) => e.role !== "admin")
        .map((e) => ({ ...e, status: e.is_active ? "Active" : "InActive" })),
    [employees],
  );

  const { query, setQuery, filteredRows } = useTableSearch(
    nonAdminEmployees,
    ["username", "email", "phone", "role"],
  );

  // Database ids have gaps (deletions, admin rows filtered out), so the
  // displayed SI.NO is a synthetic 1-to-n position within the current
  // filtered/search result, independent of the underlying id.
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "serialNo",
        headerName: "SI.NO",
        width: 100,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) =>
          filteredRows.findIndex((r) => r.id === row.id) + 1,
      },
      ...baseColumns,
    ],
    [filteredRows],
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

    const hasChanges = Object.keys(payload).some(
      (key) => payload[key as keyof Employee] !== (oldRow as any)[key],
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
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
          Employee Details
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <TableSearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search employees..."
          />
          <Button onClick={() => openDialog("user")}>+ Add Employee</Button>
        </div>
      </div>
      <Table<EmployeeRow>
        rows={filteredRows}
        columns={columns}
        processRowUpdate={processRowUpdate}
        onDelete={handleDeleteEmployee}
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
    </main>
  );
};

export default Employee;
