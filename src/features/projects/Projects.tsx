import { useMemo } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { useAppStore } from "../../store/useAppStore";
import { useDialogStore } from "../../store/useDialogStore";
import { useProjectStore, type Project, type ProjectOrder } from "../../store/useProjectStore";
import BulkDeleteButton from "../../ui/BulkDeleteButton";
import Button from "../../ui/Button";
import Dialog from "../../ui/Dialog";
import FilterMenu from "../../ui/FilterMenu";
import RefreshButton from "../../ui/RefreshButton";
import Table from "../../ui/Table";
import TableSearchBar from "../../ui/TableSearchBar";
import { getRowClassName } from "../../utils/appSupport";
import AddCustomer from "../customers/AddCustomer";
import AddProject from "./AddProject";
import DeliveryCheck from "./DeliveryCheck";
import ProjectFilesList from "./ProjectFilesList";
import ProjectRowActions from "./list/ProjectRowActions";
import { buildProjectColumns, projectFilterFields } from "./list/projectColumns";
import { useProjectList } from "./list/useProjectList";
import { useProjectListActions } from "./list/useProjectListActions";

interface ProjectsProps {
  // Only the admin "Ongoing Activities" route sets this - everything else
  // (the employee view at "/", the new Project History page) is left
  // completely unaffected and keeps seeing every project, unfiltered,
  // exactly as before this feature existed.
  filterOngoing?: boolean;
  order?: ProjectOrder;
  title?: string;
  // Project History is a browse/archive view - creating new ongoing work
  // from there would be a confusing place to do it, so it drops the two
  // "+Add" buttons but keeps everything else (search, filters, edit,
  // delete, invoices, milestones) identical to Ongoing Activities.
  hideCreateActions?: boolean;
}

const Projects = ({
  filterOngoing = false,
  order,
  title = "Ongoing Activities",
  hideCreateActions = false,
}: ProjectsProps = {}) => {
  const user = useAppStore((s) => s.user);
  // Bulk delete and invoice generation stay admin-only - project deletion at
  // scale and billing are admin-level operations, unlike search/filter/add
  // customer which are just as useful day-to-day for employees.
  const isAdmin = user?.role === "admin";

  const openDialog = useDialogStore((s) => s.openDialog);
  const projects = useProjectStore((s) => s.projects);
  const projectsTotal = useProjectStore((s) => s.projectsTotal);
  const projectsLoading = useProjectStore((s) => s.projectsLoading);

  const {
    focusedProjectId,
    clearFocusedProject,
    searchInput,
    setSearchInput,
    printStatusFilter,
    setPrintStatusFilter,
    customerFilter,
    setCustomerFilter,
    paginationModel,
    setPaginationModel,
    loadProjects,
  } = useProjectList({ filterOngoing, order });
  const actions = useProjectListActions(loadProjects);

  const columns = useMemo(() => buildProjectColumns(isAdmin), [isAdmin]);

  const rows = useMemo(() => {
    return projects.map((p) => ({
      id: String(p.id),
      project_type: p.project_type,
      assigned_to: p.assigned_to,
      start_date: p.start_date,
      delivery_date: p.delivery_date,
      client_status: p.client_status,
      print_status: p.print_status,
      description: p.description,
      status: p.client_status,
      file_paths: p.file_paths || [],
      design_completed_at: p.design_completed_at,
      design_completed_by: p.design_completed_by,
      print_completed_at: p.print_completed_at,
      print_completed_by: p.print_completed_by,
      delivered_at: p.delivered_at,
      delivered_by: p.delivered_by,
      notified_at: p.notified_at,
      notified_by: p.notified_by,
      customer_id: p.customer_id,
      customer_name: p.customer_name,
      pinned: p.pinned,
    }));
  }, [projects]);

  return (
    <div className="h-full p-4">
      <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 min-w-0 rounded-2xl sm:rounded-3xl bg-blue-50/50 shadow-xs border border-blue-100/60">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-4xl leading-tight sm:leading-snug lg:leading-snug bg-linear-to-br from-blue-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            {title}
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
                onChange={(value) => {
                  // Typing a real search should drop out of the single-
                  // project focus view rather than being silently ignored
                  // by the server (project_id, when set, wins over search).
                  if (focusedProjectId) clearFocusedProject();
                  setSearchInput(value);
                }}
                placeholder="Search projects or customers..."
                shortcuts
                sx={{ flex: 1, minWidth: 0 }}
              />

              <FilterMenu
                fields={projectFilterFields}
                values={{
                  printStatus: printStatusFilter,
                  customer: customerFilter,
                }}
                onChange={(key, value) => {
                  if (focusedProjectId) clearFocusedProject();
                  if (key === "printStatus") setPrintStatusFilter((value as string) ?? "");
                  if (key === "customer") setCustomerFilter(value);
                }}
                onClearAll={() => {
                  setPrintStatusFilter("");
                  setCustomerFilter(undefined);
                }}
              />

              <RefreshButton onRefresh={loadProjects} loading={projectsLoading} />

              {isAdmin && (
                <BulkDeleteButton
                  selectedCount={actions.selectedIds.length}
                  onDelete={actions.bulkDelete}
                />
              )}
            </div>

            {!hideCreateActions && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Focused-project banner - only shown when we arrived here via a
            dashboard/notification row's exact-id jump (see
            clearFocusedProject above); "View all projects" is the way back
            to the normal, unfiltered list. */}
        {focusedProjectId && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-xl bg-blue-100/70 border border-blue-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <PlaceRoundedIcon sx={{ fontSize: 18 }} />
              Showing project #{focusedProjectId}
            </div>
            <button
              type="button"
              onClick={clearFocusedProject}
              className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              View all projects
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        )}

        {/* Table Section */}
          <Table<Project>
            rows={rows}
            columns={columns}
            processRowUpdate={actions.processRowUpdate}
            getRowClassName={getRowClassName}
            checkboxSelection={isAdmin}
            onDelete={actions.deleteOne}
            renderActions={(params, handlers) => [
              <ProjectRowActions key="crud" params={params} handlers={handlers} actions={actions} isAdmin={isAdmin} />,
            ]}
            onSelectionChange={(newSelectionModel) => {
              actions.setSelectedIds(newSelectionModel as string[]);
            }}
            rowSelectionModel={actions.selectedIds}
            paginationMode="server"
            rowCount={projectsTotal}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={projectsLoading}
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
        <Dialog
          type="deliveryCheck"
          title="Delivery"
          children={<DeliveryCheck />}
          maxWidth="md"
        />
      </div>
    </div>
  );
};

export default Projects;
