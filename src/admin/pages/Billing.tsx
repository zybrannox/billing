import Table from "../../common/componets/Table";
import type { GridColDef } from "@mui/x-data-grid";
import CrudActions from "../../ui/Actions";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import FilePreview from "../../common/componets/FilePreview";
import { useEffect } from "react";
import axios from "axios";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { SemanticSelectEditCell } from "../../ui/Select";
import Dialog from "../../ui/Dialog";
import { formatDateTime } from "../../utils/dateFormatter";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// const priorityOrder: Record<string, number> = {
//   Urgent: 1,
//   High: 2,
//   Normal: 3,
//   Low: 4,
// };

const columns: GridColDef[] = [
  {
    field: "project_type",
    headerName: "Project Type",
    flex: 1,
    editable: true,
  },
  { field: "assigned_to", headerName: "Assignee", flex: 1, editable: true },
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
  // {
  //   field: "priority",
  //   headerName: "Priority",
  //   flex: 1.5,
  //   editable: true,
  //   type: "singleSelect",
  //   valueOptions: ["Low", "Normal", "High", "Urgent"],
  //   // Custom sorting logic
  //   sortComparator: (v1, v2) => {
  //     const order1 = priorityOrder[v1 as string] || 5; // Default for unknown values
  //     const order2 = priorityOrder[v2 as string] || 5;
  //     return order1 - order2;
  //   },
  //   renderCell: ({ value }) => (
  //     <Chip
  //       label={value}
  //       sx={semanticChipSx(getSemanticColor("priority", value))}
  //     />
  //   ),
  //   renderEditCell: (params) => (
  //     <SemanticSelectEditCell {...params} semantic="priority" />
  //   ),
  // },
  // {
  //   field: "client_status",
  //   headerName: "Client Status",
  //   flex: 1.5,
  //   editable: true,
  //   type: "singleSelect",
  //   valueOptions: ["Confirmed", "Correction"],
  //   renderCell: ({ value }) => (
  //     <Chip
  //       label={value}
  //       sx={semanticChipSx(getSemanticColor("clientStatus", value))}
  //     />
  //   ),
  //   renderEditCell: (params) => (
  //     <SemanticSelectEditCell {...params} semantic="clientStatus" />
  //   ),
  // },
  // {
  //   field: "project_status",
  //   headerName: "Status",
  //   flex: 1.5,
  //   editable: true,
  //   type: "singleSelect",
  //   valueOptions: ["Pending", "In Progress", "Completed", "Delayed"],
  //   renderCell: ({ value }) => (
  //     <Chip
  //       label={value}
  //       sx={semanticChipSx(getSemanticColor("projectStatus", value))}
  //     />
  //   ),
  //   renderEditCell: (params) => (
  //     <SemanticSelectEditCell {...params} semantic="projectStatus" />
  //   ),
  // },
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

const AdminProjects = () => {
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
      const res = await axios.get(`${API_BASE_URL}/projects/billing`);

      setProjects(res.data);
    };

    fetchProjects();
  }, [setProjects]);

  const { updateProject } = useProjectStore();

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
    <div className="h-full grid grid-cols-[1fr_300px] gap-4 items-center p-4">
      <div className="h-full p-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
        <h1 className="text-4xl sm:text-5xl lg:text-4xl mb-6 leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
          Out For Billing
        </h1>
        <Table<Project>
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          renderActions={(params, handlers) => [
            <CrudActions
              key="crud"
              info
              data={params.row}
              delete
              onDelete={handlers.delete}
            />,
          ]}
        />
      </div>
      <div className="h-full items-center">
        <div className="rounded-3xl bg-blue-50 h-full p-4 shadow">
          <FilePreview />
          <Dialog />
        </div>
      </div>
    </div>
  );
};

export default AdminProjects;
