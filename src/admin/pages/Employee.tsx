import type { Project } from "../../store/useProjectStore";
import type { GridColDef } from "@mui/x-data-grid";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useEffect, useState } from "react";
import CrudActions from "../../ui/Actions";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { SemanticSelectEditCell } from "../../ui/Select";
import Button from "../../ui/Button";
import { useDialogStore } from "../../store/useDialogStore";
import AddEmployee from "./AddEmployee";
import Dialog from "../../ui/Dialog";
import Table from "../../common/components/Table";

const columns: GridColDef[] = [
  { field: "id", headerName: "SI.NO", width: 100 },
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
    field: "is_active",
    headerName: "Status",
    flex: 1,
    editable: true,
    type: "singleSelect",
    // Options match the strings used in getters/setters
    valueOptions: ["Active", "InActive"],

    // 1. Convert boolean FROM the database TO string for the UI
    valueGetter: (value) => {
      return value === true ? "Active" : "InActive";
    },

    // 2. Convert string FROM the UI back TO boolean for the database
    valueSetter: (params) => {
      const newValue = params.value === "Active";
      return { ...params.row, is_active: newValue };
    },

    renderCell: ({ value }) => (
      <Chip
        label={value} // value is now "Active" or "InActive" thanks to valueGetter
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
  const { sendRequest, loading } = useApiRequest();
  const [employees, setEmployees] = useState();
  const handleSubmit = async () => {
    await sendRequest({
      endpoint: "/users/",
      method: "get",
      onSuccess: (res) => {
        console.log("Employee added", res);
        setEmployees(res);
        // toast.success("Employee added");
      },
      onError: (err) => {
        console.log("Error", err);
        // toast.error(err.message || "Error adding employee");
      },
    });
  };
  useEffect(() => {
    handleSubmit();
  }, []);

  return (
    <main className="h-full p-4 m-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
          Employee Details
        </h1>
        {/* <ButtonLink to="new">+ Add Employee</ButtonLink> */}
        <Button onClick={() => openDialog(<AddEmployee />, "Add New Employee")}>
          + Add Employee
        </Button>
      </div>
      <Table<Project>
        rows={employees}
        columns={columns}
        renderActions={(params, handlers) => [
          <CrudActions
            key="crud"
            edit
            delete
            onEdit={handlers.edit}
            onDelete={handlers.delete}
          />,
        ]}
      />
      <Dialog />
    </main>
  );
};

export default Employee;
