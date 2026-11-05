import { useState } from "react";
import { apiService } from "../../../api/service";
import { useConfirmDialogStore } from "../../../hooks/useconfirmDialogStore";
import { usePermission } from "../../../hooks/usePermission";
import { useDialogStore } from "../../../store/useDialogStore";
import { useProjectStore, type Project } from "../../../store/useProjectStore";
import { notifyClientWhatsApp } from "../notifyClientWhatsApp";

// What can be done to projects in the list, each refreshing it afterwards as needed.
export function useProjectListActions(reload: () => void) {
  const canCreateInvoice = usePermission("invoice.create");
  const openDialog = useDialogStore((s) => s.openDialog);
  const updateProject = useProjectStore((s) => s.updateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const deleteProjects = useProjectStore((s) => s.deleteProjects);
  const markPrintCompleted = useProjectStore((s) => s.markPrintCompleted);
  const markDesignCompleted = useProjectStore((s) => s.markDesignCompleted);
  const togglePinProject = useProjectStore((s) => s.togglePinProject);
  const notifyClient = useProjectStore((s) => s.notifyClient);
  const showDialog = useConfirmDialogStore((s) => s.showDialog);
  const closeDialog = useConfirmDialogStore((s) => s.closeDialog);
  const setLoading = useConfirmDialogStore((s) => s.setLoading);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const processRowUpdate = async (newRow: Project, oldRow: Project) => {
    const payload: Partial<Project> = {
      project_type: newRow.project_type,
      assigned_to: newRow.assigned_to,
      start_date: newRow.start_date,
      delivery_date: newRow.delivery_date,
      client_status: newRow.client_status,
      print_status: newRow.print_status,
      description: newRow.description,
    };

    const hasChanges = (Object.keys(payload) as (keyof Project)[]).some(
      (key) => payload[key] !== (oldRow as Project)[key],
    );

    if (!hasChanges) return oldRow;

    await updateProject(newRow.id, payload); // ✅ API fires ONLY on Save
    return newRow;
  };

  const markPrintCompleted_ = (id: string) => {
    showDialog({
      title: "Mark Print Completed?",
      description: "This flags printing as done for this order.",
      confirmText: "Mark Completed",
      onConfirm: async () => {
        try {
          setLoading(true);
          await markPrintCompleted(id);
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Fetched on demand (not preloaded per row) since most projects are
  // browsed far more often than their invoice is actually opened - a
  // project without one yet just gets a friendly message here instead of
  // the menu having to know in advance whether one exists.
  const viewInvoice = async (id: string | number) => {
    try {
      const invoice = await apiService.get<{ id: number }>(
        `/invoices/project/${id}/latest`,
      );
      openDialog("viewInvoice", invoice.id, "view");
    } catch {
      showDialog({
        title: "No Invoice Yet",
        description: "This project hasn't been invoiced yet.",
        confirmText: "OK",
      });
    }
  };

  const deleteOne = async (id: string | number) => {
    await deleteProject(String(id));
    reload();
  };

  const markDesignCompleted_ = (id: string | number) => {
    if (canCreateInvoice) {
      openDialog("invoiceDesignComplete", id, "add");
      return;
    }
    showDialog({
      title: "Mark design as completed?",
      description: "An admin or someone with invoice access can create the invoice for this project afterwards.",
      confirmText: "Mark completed",
      onConfirm: async () => {
        setLoading(true);
        try {
          await markDesignCompleted(String(id));
          reload();
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Pin/unpin also changes sort order (pinned projects sort first - see
  // GET /projects), not just the icon's own state, so this refetches the
  // current page afterward the same way delete does, rather than leaving
  // the row showing pinned but stuck in its old position.
  const togglePin = async (id: string | number) => {
    await togglePinProject(String(id));
    reload();
  };

  // Opens WhatsApp with a pre-filled message (see notifyClientWhatsApp.ts -
  // addressless, same as every other WhatsApp share in this app; staff
  // picks the actual recipient in WhatsApp itself) and separately records
  // that a notify happened (PATCH /projects/{id}/notify), independent of
  // whether the wa.me tab is actually used to send anything.
  const notify = (row: Project) => {
    notifyClientWhatsApp({ project_type: row.project_type, customer_name: row.customer_name });
    notifyClient(String(row.id));
  };

  const bulkDelete = () => {
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
          reload();
          closeDialog();
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return {
    processRowUpdate,
    deleteOne,
    bulkDelete,
    selectedIds,
    setSelectedIds,
    markPrintCompleted: markPrintCompleted_,
    markDesignCompleted: markDesignCompleted_,
    viewInvoice,
    togglePin,
    notify,
  };
}

export type ProjectListActions = ReturnType<typeof useProjectListActions>;
