import type { GridColDef } from "@mui/x-data-grid";
import CrudActions from "../../ui/Actions";
import { useProjectStore, type Project } from "../../store/useProjectStore";
import { useEffect, useMemo, useState } from "react";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import { getSemanticColor } from "../../utils/colors";
import { SemanticSelectEditCell } from "../../ui/Select";
import Dialog from "../../ui/Dialog";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useAppStore } from "../../store/useAppStore";
import AddProject from "./AddProject";
import AddCustomer from "./AddCustomer";
import GenerateInvoice from "./GenerateInvoice";
import Button from "../../ui/Button";
import { getRowClassName } from "../../utils/appSupport";
import { formatDateTime } from "../../utils/dateFormatter";
import Table from "../components/Table";
import ProjectFilesList from "../components/ProjectFilesList";
import TableSearchBar from "../components/TableSearchBar";
import FilterMenu, {
  type FilterFieldDefinition,
} from "../components/FilterMenu";
import BulkDeleteButton from "../components/BulkDeleteButton";

const priorityOrder: Record<string, number> = {
  Urgent: 1,
  High: 2,
  Normal: 3,
};

const printStatusOrder: Record<string, number> = {
  Pending: 1,
  "In Progress": 2,
  Completed: 3,
};

const filterFields: FilterFieldDefinition[] = [
  {
    type: "select",
    key: "printStatus",
    label: "Print Status",
    placeholder: "All",
    options: ["Pending", "In Progress", "Completed"],
  },
  {
    type: "select",
    key: "priority",
    label: "Priority",
    placeholder: "All",
    options: ["Urgent", "High", "Normal"],
  },
  {
    type: "async_select",
    key: "customer",
    label: "Customer",
    endpoint: "/customers",
    extraParams: { limit: 20 },
    getOptionLabel: (c) => `${c.first_name} ${c.last_name}`,
    getOptionValue: (c) => c.id,
  },
];

const Projects = () => {
  const { user } = useAppStore();
  // Bulk delete and invoice generation stay admin-only - project deletion at
  // scale and billing are admin-level operations, unlike search/filter/add
  // customer which are just as useful day-to-day for employees.
  const isAdmin = user?.role === "admin";

  const { openDialog } = useDialogStore();
  const projects = useProjectStore((s) => s.projects);
  const projectsTotal = useProjectStore((s) => s.projectsTotal);
  const projectsLoading = useProjectStore((s) => s.projectsLoading);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const { updateProject, deleteProjects, markDesignCompleted, markDelivered } =
    useProjectStore();

  const columns: GridColDef[] = useMemo(
    () => [
           {
        field: "customer_name",
        headerName: "Customer",
        flex: 1,
        editable: false,
        // Editing which customer a project belongs to needs the same
        // search-driven picker as the create form, not a plain text edit -
        // out of scope here, this column is display-only.
        renderCell: ({ value }) => value || "—",
      },
      {
        field: "assigned_to",
        headerName: "Assignee",
        flex: 1,
        editable: isAdmin,
      },
      {
        field: "project_type",
        headerName: "Project Type",
        flex: 1,
        editable: true,
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
        // Lets a user re-sort the *current page* by clicking the column header.
        // The default (no header sort applied) order comes from the server.
        sortComparator: (v1, v2) => {
          const order1 = priorityOrder[v1 as string] || 5;
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
        // "Completed" only becomes selectable once the design phase is marked
        // done - keeps the impossible state from ever being offered, rather
        // than letting the user pick it and bouncing off a server error.
        valueOptions: ({ row }) =>
          row?.design_completed_at
            ? ["Pending", "In Progress", "Completed"]
            : ["Pending", "In Progress"],
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
    ],
    [isAdmin],
  );

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
      design_completed_at: p.design_completed_at,
      design_completed_by: p.design_completed_by,
      delivered_at: p.delivered_at,
      delivered_by: p.delivered_by,
      customer_name: p.customer_name,
    }));
  }, [projects]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { showDialog, closeDialog, setLoading } = useConfirmDialogStore();

  // Search/filters are sent to the server rather than applied client-side,
  // so the browser never has to hold more than one page of projects.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [printStatusFilter, setPrintStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string | number | undefined>(
    undefined,
  );
  const [paginationModel, setPaginationModel] = useState({
    page: 0, // MUI DataGrid pages are 0-indexed; the API is 1-indexed.
    pageSize: 10,
  });

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Any new search/filter should land back on page 1.
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [debouncedSearch, printStatusFilter, priorityFilter, customerFilter]);

  useEffect(() => {
    fetchProjects({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      search: debouncedSearch,
      printStatus: printStatusFilter,
      priority: priorityFilter,
      customerId: customerFilter,
    });
  }, [
    fetchProjects,
    paginationModel,
    debouncedSearch,
    printStatusFilter,
    priorityFilter,
    customerFilter,
  ]);

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
    <div className="h-full p-4">
      <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 min-w-0 rounded-2xl sm:rounded-3xl bg-blue-50/50 shadow-xs border border-blue-100/60">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            Ongoing Activities
          </h1>

          {/* Actions Toolbar - on mobile this is two grouped rows (icon
              controls, then action buttons) instead of one that wraps
              arbitrarily; a plain flex-wrap let items break apart wherever
              they happened to run out of space, so the delete icon could
              end up stranded alone on its own line, disconnected from the
              search/filter controls it belongs with. Desktop is unaffected
              - at md+ both rows sit inline exactly as before. */}
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <div className="flex items-center gap-2.5">
              <TableSearchBar
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search projects..."
                sx={{ flex: 1, minWidth: 0 }}
              />

              <FilterMenu
                fields={filterFields}
                values={{
                  printStatus: printStatusFilter,
                  priority: priorityFilter,
                  customer: customerFilter,
                }}
                onChange={(key, value) => {
                  if (key === "printStatus") setPrintStatusFilter((value as string) ?? "");
                  if (key === "priority") setPriorityFilter((value as string) ?? "");
                  if (key === "customer") setCustomerFilter(value);
                }}
                onClearAll={() => {
                  setPrintStatusFilter("");
                  setPriorityFilter("");
                  setCustomerFilter(undefined);
                }}
              />

              {isAdmin && (
                <BulkDeleteButton
                  selectedCount={selectedIds.length}
                  onDelete={handleBulkDelete}
                />
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block mx-0.5" />

            <div className="flex items-center gap-2.5">
              <Button
                variantColor="outline"
                onClick={() => openDialog("customer")}
                sx={{ float: "none" }}
                className="flex-1 md:flex-none"
              >
                + Add Customer
              </Button>

              <Button
                onClick={() => openDialog("project")}
                sx={{ float: "none" }}
                className="flex-1 md:flex-none"
              >
                + Add Project
              </Button>
            </div>
          </div>
        </div>

        {/* Table Section */}
          <Table<Project>
            rows={rows}
            columns={columns}
            processRowUpdate={processRowUpdate}
            getRowClassName={getRowClassName}
            checkboxSelection={isAdmin}
            renderActions={(params, handlers) => [
              <CrudActions
                key="crud"
                edit
                download
                delete
                info
                invoice={isAdmin}
                orderMilestones
                data={params.row}
                onEdit={handlers.edit}
                onDelete={handlers.delete}
                onDownload={handlers.download}
                onGenerateInvoice={
                  isAdmin
                    ? () => openDialog("invoice", params.row.id, "add")
                    : undefined
                }
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
            onSelectionChange={(newSelectionModel) => {
              setSelectedIds(newSelectionModel as string[]);
            }}
            rowSelectionModel={selectedIds}
            paginationMode="server"
            rowCount={projectsTotal}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={projectsLoading}
            // Clicking a row expands its files inline (accordion-style) as
            // a compact Gmail-attachments-style chip row, not the old
            // side-by-side big-preview panel - ProjectFilesList still
            // reads the clicked row from useProjectStore. The row's height
            // auto-fits whatever it renders (see Table.tsx's getRowHeight).
            renderDetailPanel={() => <ProjectFilesList />}
          />

        {/* Dialog Overlays */}
        <Dialog
          type="project"
          title="Project"
          children={<AddProject />}
          maxWidth="md"
        />
        <Dialog
          type="customer"
          title="Customer"
          children={<AddCustomer />}
          maxWidth="xs"
        />
        {isAdmin && (
          <Dialog
            type="invoice"
            title="Invoice"
            children={<GenerateInvoice />}
            maxWidth="xs"
          />
        )}
      </div>
    </div>
  );
};

export default Projects;
