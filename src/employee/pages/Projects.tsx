import type { GridColDef } from "@mui/x-data-grid";
import CrudActions from "../../ui/Actions";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import { useEffect } from "react";
import axios from "axios";
import Button from "../../ui/Button";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { SemanticSelectEditCell } from "../../ui/Select";
import Dialog from "../../ui/Dialog";
import { useDialogStore } from "../../store/useDialogStore";
import AddProject from "../../common/pages/AddProject";
import { getRowClassName } from "../../utils/appSupport";
import { formatDateTime } from "../../utils/dateFormatter";
import Table from "../../common/components/Table";
import FilePreview from "../../common/components/FilePreview";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const columns: GridColDef[] = [
  { field: "id", headerName: "SI.NO", width: 60 },
  {
    field: "project_type",
    headerName: "Project Type",
    flex: 1,
    editable: true,
  },
  { field: "assigned_to", headerName: "Assignee", flex: 1, editable: false },
  {
    field: "start_date",
    headerName: "Start Date",
    flex: 1.5,
    editable: true,
    valueFormatter: (value) => formatDateTime(value),
  },
  {
    field: "delivery_date",
    headerName: "Delivery Date",
    flex: 1.5,
    editable: true,
    valueFormatter: (value) => formatDateTime(value),
  },
  {
    field: "priority",
    headerName: "Priority",
    flex: 1.5,
    editable: true,
    type: "singleSelect",
    valueOptions: ["Low", "Normal", "High", "Urgent"],
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
  {
    field: "client_status",
    headerName: "Client Status",
    flex: 1.5,
    editable: true,
    type: "singleSelect",
    valueOptions: ["Confirmed", "Correction"],
    renderCell: ({ value }) => (
      <Chip
        label={value}
        sx={semanticChipSx(getSemanticColor("clientStatus", value))}
      />
    ),
    renderEditCell: (params) => (
      <SemanticSelectEditCell {...params} semantic="clientStatus" />
    ),
  },
  {
    field: "print_status",
    headerName: "Print Status",
    flex: 1.5,
    editable: true,
    type: "singleSelect",
    valueOptions: ["Pending", "In Progress", "Completed"],
    renderCell: ({ value }) => (
      <Chip
        label={value}
        sx={semanticChipSx(getSemanticColor("printStatus", value))}
      />
    ),
    renderEditCell: (params) => (
      <SemanticSelectEditCell {...params} semantic="printStatus" />
    ),
  },
  // {
  //   field: "description",
  //   headerName: "Description",
  //   flex: 1,
  //   editable: true,
  // },
];

const EmployeeProjects = () => {
  const setProjects = useProjectStore((state) => state.setProjects);
  const projects = useProjectStore((s) => s.projects);
  const rows = projects.map((p) => ({
    id: p.id,
    project_type: p.project_type,
    assigned_to: p.assigned_to,
    start_date: p.start_date,
    delivery_date: p.delivery_date,
    priority: p.priority,
    client_status: p.client_status,
    print_status: p.print_status,
    description: p.description,
    status: p.client_status,
    file_paths: p.file_paths || [],
  }));

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/`);
      setProjects(res.data);
    };
    fetchProjects();
  }, [setProjects]);
  const { updateProject } = useProjectStore();
  const { openDialog } = useDialogStore();

  const processRowUpdate = async (newRow: Project, oldRow: Project) => {
    const payload: Partial<Project> = {
      project_type: newRow.project_type,
      assigned_to: newRow.assigned_to,
      start_date: newRow.start_date,
      delivery_date: newRow.delivery_date,
      priority: newRow.priority,
      client_status: newRow.client_status,
      print_status: newRow.print_status,
      description: newRow.description,
    };

    const hasChanges = Object.keys(payload).some(
      (key) => payload[key as keyof Project] !== (oldRow as any)[key],
    );

    if (!hasChanges) return oldRow;

    await updateProject(newRow.id, payload); // ✅ API fires ONLY on Save
    return newRow;
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 lg:items-center p-4">
      <div className="h-full p-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            Ongoing Activities
          </h1>

          <Button onClick={() => openDialog("project")}>+ Add Project</Button>
        </div>

        <Table<Project>
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          getRowClassName={getRowClassName}
          renderActions={(params, handlers) => [
            <CrudActions
              key="crud"
              edit
              download
              delete
              info
              data={params.row}
              onEdit={handlers.edit}
              onDelete={handlers.delete}
            />,
          ]}
        />
      </div>
      <div className="min-h-[420px] lg:min-h-0 lg:h-full items-center">
        <div className="rounded-3xl bg-blue-50 h-full p-4 shadow">
          <FilePreview />
          <Dialog
            title="new Project"
            children={<AddProject />}
            maxWidth="md"
            apiEndPoint="/"
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeProjects;
