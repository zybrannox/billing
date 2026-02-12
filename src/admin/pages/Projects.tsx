import type { GridColDef } from "@mui/x-data-grid";
import CrudActions from "../../ui/Actions";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import { useEffect, useState, useMemo } from "react";
import { Badge, Tooltip } from "@mui/material";
import axios from "axios";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { SemanticSelectEditCell } from "../../ui/Select";
import Dialog from "../../ui/Dialog";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import AddProject from "../../common/pages/AddProject";
import Button from "../../ui/Button";
import { getRowClassName } from "../../utils/appSupport";
import DeleteIcon from "@mui/icons-material/Delete";
import { formatDateTime } from "../../utils/dateFormatter";
import Table from "../../common/components/Table";
import FilePreview from "../../common/components/FilePreview";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const priorityOrder: Record<string, number> = {
  Urgent: 1,
  High: 2,
  Normal: 3,
  Low: 4,
};

const printStatusOrder: Record<string, number> = {
  Pending: 1,
  "In Progress": 2,
  Completed: 3,
};

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
  {
    field: "priority",
    headerName: "Priority",
    flex: 1.5,
    editable: true,
    type: "singleSelect",
    valueOptions: ["Low", "Normal", "High", "Urgent"],
    // Custom sorting logic
    sortComparator: (v1, v2) => {
      const order1 = priorityOrder[v1 as string] || 5; // Default for unknown values
      const order2 = priorityOrder[v2 as string] || 5;
      return order1 - order2;
    },
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
    sortComparator: (v1, v2) => {
      const order1 = printStatusOrder[v1 as string] || 4;
      const order2 = printStatusOrder[v2 as string] || 4;
      return order1 - order2;
    },
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
  const { openDialog } = useDialogStore();
  const setProjects = useProjectStore((state) => state.setProjects);
  const projects = useProjectStore((s) => s.projects);
  const rows = useMemo(() => {
    return projects.map((p) => ({
      id: String(p.id),
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
  }, [projects]);

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/`);
      setProjects(res.data);
    };
    fetchProjects();
  }, [setProjects]);
  const { updateProject, deleteProjects } = useProjectStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();

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

  const handleBulkDelete = () => {
    showDialog({
      title: "Delete Selected?",
      description: `Are you sure you want to delete ${selectedIds.length} projects?`,
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await deleteProjects(selectedIds);
          setSelectedIds([]);
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="h-full grid grid-cols-[1fr_300px] gap-4 items-center p-4">
      <div className="h-full p-4 md:p-10 min-w-0 rounded-3xl bg-blue-50 shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            Ongoing Activities
          </h1>

          <div className="flex items-center gap-3">
            <Tooltip
              title={selectedIds.length === 0 ? "Select items to delete" : ""}
            >
              <span>
                <Button
                  variantColor="transparent"
                  onClick={handleBulkDelete}
                  startIcon={
                    <Badge badgeContent={selectedIds.length} color="error">
                      <DeleteIcon />
                    </Badge>
                  }
                  sx={{ float: "none" }}
                  disabled={selectedIds.length === 0}
                />
              </span>
            </Tooltip>
            <Button
              onClick={() => openDialog("project")}
              sx={{ float: "none" }}
            >
              + Add Project
            </Button>
          </div>
          <Dialog
            title="new Project"
            children={<AddProject />}
            maxWidth="md"
            apiEndPoint="/"
          />
        </div>
        <Table<Project>
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          getRowClassName={getRowClassName}
          checkboxSelection={true}
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
              onDownload={handlers.download}
            />,
          ]}
          onSelectionChange={(newSelectionModel) => {
            setSelectedIds(newSelectionModel as string[]);
          }}
          rowSelectionModel={selectedIds}
          initialState={{
            sorting: {
              sortModel: [{ field: "print_status", sort: "asc" }],
            },
          }}
        />
      </div>
      <div className="h-full items-center">
        <div className="rounded-3xl bg-blue-50 h-full p-4 shadow">
          <FilePreview />
        </div>
      </div>
    </div>
  );
};

export default AdminProjects;
