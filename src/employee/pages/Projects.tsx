import type { GridColDef } from "@mui/x-data-grid";
import CrudActions from "../../ui/Actions";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import { useEffect, useMemo } from "react";
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
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";

const baseColumns: GridColDef[] = [
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
    valueOptions: ["Normal", "High", "Urgent"],
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
    // "Completed" only becomes selectable once the design phase is marked
    // done - keeps the impossible state from ever being offered, rather
    // than letting the user pick it and bouncing off a server error.
    valueOptions: ({ row }) =>
      row?.design_completed_at
        ? ["Pending", "In Progress", "Completed"]
        : ["Pending", "In Progress"],
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
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const rows = useMemo(
    () =>
      projects.map((p) => ({
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
        design_completed_at: p.design_completed_at,
        design_completed_by: p.design_completed_by,
        delivered_at: p.delivered_at,
        delivered_by: p.delivered_by,
      })),
    [projects],
  );

  // This page pulls a single page of up to 100 rows (no pagination UI), so
  // SI.NO is just the row's position in that list - sequential 1-to-n
  // regardless of the underlying project id.
  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "serialNo",
        headerName: "SI.NO",
        width: 60,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) =>
          rows.findIndex((r) => r.id === row.id) + 1,
      },
      ...baseColumns,
    ],
    [rows],
  );

  useEffect(() => {
    // This page has no pagination UI yet, so pull a single large page. The
    // server still applies the default print_status/priority sort.
    fetchProjects({ pageSize: 100 });
  }, [fetchProjects]);
  const { updateProject, markDesignCompleted, markDelivered } = useProjectStore();
  const { openDialog } = useDialogStore();
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();

  const handleMarkDesignCompleted = (id: string) => {
    showDialog({
      title: "Mark Design Completed?",
      description:
        "This flags the design phase as done for this order. The customer will later be notified automatically when messaging is wired up.",
      confirmText: "Mark Completed",
      onConfirm: async () => {
        try {
          setLoading(true);
          await markDesignCompleted(id);
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleMarkDelivered = (id: string) => {
    showDialog({
      title: "Mark Order Delivered?",
      description: "This flags the order as delivered to the customer.",
      confirmText: "Mark Delivered",
      onConfirm: async () => {
        try {
          setLoading(true);
          await markDelivered(id);
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

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
          // This page loads a single large page of up to 100 rows (see the
          // fetchProjects call above) rather than paginating, so the grid's
          // own page-size options need to include that number - otherwise
          // MUI warns that its default page size isn't in the options list.
          pageSizeOptions={[100]}
          renderActions={(params, handlers) => [
            <CrudActions
              key="crud"
              edit
              download
              delete
              info
              orderMilestones
              data={params.row}
              onEdit={handlers.edit}
              onDelete={handlers.delete}
              printStatus={params.row.print_status}
              designCompletedMeta={
                params.row.design_completed_at
                  ? {
                      at: params.row.design_completed_at,
                      by: params.row.design_completed_by,
                    }
                  : null
              }
              deliveredMeta={
                params.row.delivered_at
                  ? { at: params.row.delivered_at, by: params.row.delivered_by }
                  : null
              }
              onMarkDesignCompleted={() =>
                handleMarkDesignCompleted(params.row.id)
              }
              onMarkDelivered={() => handleMarkDelivered(params.row.id)}
            />,
          ]}
        />
      </div>
      <div className="min-h-[420px] lg:min-h-0 lg:h-full items-center">
        <div className="rounded-3xl bg-blue-50 h-full p-4 shadow">
          <FilePreview />
          <Dialog
            type="project"
            title="Project"
            children={<AddProject />}
            maxWidth="md"
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeProjects;
