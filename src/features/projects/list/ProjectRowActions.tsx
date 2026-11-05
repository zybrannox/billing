import type { GridRowParams } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { useDialogStore } from "../../../store/useDialogStore";
import CrudActions from "../../../ui/Actions";
import type { RowActionHandlers } from "../../../ui/table/useRowActions";
import type { ProjectListActions } from "./useProjectListActions";

// Who did a step and when, for a milestone button's tooltip.
const meta = (at?: string | null, by?: string | null) => (at ? { at, by: by ?? "" } : null);

// A project row's actions: its milestones, plus the rest under "More actions".
export default function ProjectRowActions({
  params,
  handlers,
  actions,
  isAdmin,
}: {
  params: GridRowParams;
  handlers: RowActionHandlers;
  actions: ProjectListActions;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const openDialog = useDialogStore((s) => s.openDialog);
  const { row } = params;

  return (
    <CrudActions
      edit
      download
      delete
      info
      pin
      orderMilestones
      viewInvoice
      onViewInvoice={() => actions.viewInvoice(row.id)}
      viewCustomer={isAdmin && !!row.customer_id}
      onViewCustomer={() => navigate(`/admin/customers/${row.customer_id}`)}
      notifyClient={!!row.customer_id}
      onNotifyClient={() => actions.notify(row)}
      data={row}
      isPinned={!!row.pinned}
      onTogglePin={() => actions.togglePin(row.id)}
      onEdit={handlers.edit}
      onDelete={handlers.delete}
      onDownload={handlers.download}
      printStatus={row.print_status}
      designCompletedMeta={meta(row.design_completed_at, row.design_completed_by)}
      printCompletedMeta={meta(row.print_completed_at, row.print_completed_by)}
      deliveredMeta={meta(row.delivered_at, row.delivered_by)}
      // With invoice access, marking design done goes through the invoice dialog
      // (see GenerateInvoice.tsx); without it, it just records the design is done.
      onMarkDesignCompleted={() => actions.markDesignCompleted(row.id)}
      onMarkPrintCompleted={() => actions.markPrintCompleted(row.id)}
      // Opens the full order/payment breakdown instead of a plain confirm: see
      // DeliveryCheck.tsx, which is itself what gates delivery on payment.
      onMarkDelivered={() => openDialog("deliveryCheck", row.id, "add")}
    />
  );
}
