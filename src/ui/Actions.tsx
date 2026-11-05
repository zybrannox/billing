import { Box, Tooltip } from "@mui/material";
import {
  EditRounded,
  DeleteForeverRounded,
  ToggleOffRounded,
  ToggleOnRounded,
  DesignServicesRounded,
  LocalShippingRounded,
  LocalPrintshopRounded,
  CheckCircleRounded,
  CancelRounded,
  PaymentsRounded,
  FileDownloadRounded,
  ThumbUpAltRounded,
  ThumbDownAltRounded,
  DownloadForOfflineRounded,
  InfoRounded,
  VisibilityRounded,
  VpnKeyRounded,
  PushPinRounded,
  PushPinOutlined,
  ReceiptLongRounded,
  PersonRounded,
  WhatsApp,
  ApartmentRounded,
  PersonAddRounded,
} from "@mui/icons-material";
import { messages } from "../messages";
import ActionButton, { MilestoneButton } from "./actions/ActionButton";
import { MILESTONE_TINTS, TINTS, milestoneTitle, type ActionSize, type MilestoneMeta } from "./actions/actionTints";
import MoreActionsMenu, { type MenuAction } from "./actions/MoreActionsMenu";
import ProjectDetailsTooltip, { type ProjectDetails } from "./ProjectDetailsTooltip";

interface CrudActionsProps {
  edit?: boolean;
  delete?: boolean;
  toggle?: boolean;
  download?: boolean;
  info?: boolean;
  preview?: boolean;
  orderMilestones?: boolean;
  changePassword?: boolean;
  pin?: boolean;
  // Billing row actions - View/Mark Paid/Cancel for one invoice.
  viewInvoice?: boolean;
  markPaid?: boolean;
  recordPayment?: boolean;
  // Download the document (invoice/quotation) as a PDF - distinct from
  // `download`, which downloads a project's uploaded files.
  downloadDocument?: boolean;
  // Quotation decision buttons - enabled only while quotationStatus is
  // "pending", same terminal-state idea as markPaid/cancelInvoice.
  acceptQuotation?: boolean;
  rejectQuotation?: boolean;
  cancelInvoice?: boolean;
  // Shares this row's invoice straight to WhatsApp (see
  // features/billing/InvoiceView.tsx's handleShareWhatsApp) without opening it
  // first - used where a row already has everything needed to identify
  // the invoice (see features/billing/CustomerInvoicesList.tsx).
  shareInvoice?: boolean;
  // Jumps from a project row (Ongoing Activities) straight to the
  // customer profile it belongs to (see features/customers/CustomerProfile.tsx).
  viewCustomer?: boolean;
  // Jumps from a customer row straight to the B2B company it's a contact
  // of (see features/companies/CompanyProfile.tsx).
  viewCompany?: boolean;
  // Grants portal access to a customer row (see Customers.tsx) - staff-
  // invited only, no public self-service signup (see app/client_auth).
  sendPortalInvite?: boolean;
  // Notifies a client their order is done via WhatsApp (see
  // features/projects/notifyClientWhatsApp.ts) - lives in the orderMilestones "More
  // actions" menu alongside shareInvoice.
  notifyClient?: boolean;
  data?: ProjectDetails;

  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onDownload?: () => void;
  onPreview?: () => void;
  onMarkDesignCompleted?: () => void;
  onMarkPrintCompleted?: () => void;
  onMarkDelivered?: () => void;
  onChangePassword?: () => void;
  onTogglePin?: () => void;
  onViewInvoice?: () => void;
  onMarkPaid?: () => void;
  onRecordPayment?: () => void;
  onDownloadDocument?: () => void;
  // Disables the download button while its PDF is being generated.
  documentBusy?: boolean;
  onAcceptQuotation?: () => void;
  onRejectQuotation?: () => void;
  quotationStatus?: string;
  onCancelInvoice?: () => void;
  onViewCustomer?: () => void;
  onShareInvoice?: () => void;
  onViewCompany?: () => void;
  onSendPortalInvite?: () => void;
  onNotifyClient?: () => void;

  isActive?: boolean;
  isPinned?: boolean;
  size?: ActionSize;
  designCompletedMeta?: MilestoneMeta | null;
  printCompletedMeta?: MilestoneMeta | null;
  deliveredMeta?: MilestoneMeta | null;
  // Delivery also requires print_status === "Completed" - passed straight
  // from the row rather than duplicated as another boolean prop.
  printStatus?: string;
  // Drives markPaid/cancelInvoice's disabled state - "paid" disables
  // Mark Paid, anything but "pending" disables Cancel.
  invoiceStatus?: string;
}

const CrudActions = ({
  edit = false,
  delete: del = false,
  toggle = false,
  download = false,
  info = false,
  preview = false,
  orderMilestones = false,
  changePassword = false,
  pin = false,
  viewInvoice = false,
  markPaid = false,
  recordPayment = false,
  downloadDocument = false,
  acceptQuotation = false,
  rejectQuotation = false,
  cancelInvoice = false,
  viewCustomer = false,
  shareInvoice = false,
  viewCompany = false,
  sendPortalInvite = false,
  notifyClient = false,
  data,

  onEdit,
  onDelete,
  onToggle,
  onDownload,
  onPreview,
  onMarkDesignCompleted,
  onMarkPrintCompleted,
  onMarkDelivered,
  onChangePassword,
  onTogglePin,
  onViewInvoice,
  onMarkPaid,
  onRecordPayment,
  onDownloadDocument,
  documentBusy = false,
  onAcceptQuotation,
  onRejectQuotation,
  quotationStatus,
  onCancelInvoice,
  onViewCustomer,
  onShareInvoice,
  onViewCompany,
  onSendPortalInvite,
  onNotifyClient,

  isActive = false,
  isPinned = false,
  size = "small",
  designCompletedMeta,
  printCompletedMeta,
  deliveredMeta,
  printStatus,
  invoiceStatus,
}: CrudActionsProps) => {
  const isDesignCompleted = !!designCompletedMeta;
  const isPrintCompleted = printStatus === "Completed";
  const isDelivered = !!deliveredMeta;
  const canDeliver = isDesignCompleted && isPrintCompleted;
  // Same server-enforced rule as the design/deliver buttons (see
  // service_update in app/projects/service.py): print can't be marked
  // Completed until the design phase is.
  const canCompletePrint = isDesignCompleted && !isPrintCompleted;

  // Pending is the only status these can act on - paid and cancelled are final
  // (service_update enforces the same rule on the server).
  const invoiceLocked = invoiceStatus !== "pending";
  const quotationLocked = quotationStatus !== "pending";

  // ProjectDetailsTooltip as a light bordered card, matching every other
  // floating panel in the app, instead of MUI's small dark tooltip bubble.
  const detailsTooltipSlotProps = {
    tooltip: {
      sx: {
        bgcolor: "var(--white)",
        p: 0,
        maxWidth: "none",
        border: "1px solid var(--slate-200)",
        borderRadius: "var(--border-radius-md, 8px)",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
      },
    },
  };

  // Pinned = yellow. Unpinned uses the app's neutral resting tone rather than
  // a disabled milestone's grey: pin is always clickable, a toggle.
  const pinButton = pin && (
    <ActionButton
      title={isPinned ? "Unpin" : "Pin to top"}
      icon={isPinned ? PushPinRounded : PushPinOutlined}
      size={size}
      onClick={onTogglePin}
      tint={
        isPinned
          ? { color: "var(--yellow-600)", bg: "rgba(202, 138, 4, 0.12)", hover: "rgba(202, 138, 4, 0.2)", border: "rgba(202, 138, 4, 0.3)" }
          : { ...TINTS.neutral, border: "rgba(100, 116, 139, 0.15)" }
      }
    />
  );

  if (orderMilestones) {
    const menuActions: (MenuAction | false)[] = [
      viewInvoice && { key: "viewInvoice", label: messages.actions.invoice.view, icon: ReceiptLongRounded, iconColor: "var(--indigo-500)", onClick: onViewInvoice },
      shareInvoice && { key: "shareInvoice", label: messages.actions.invoice.shareWhatsApp, icon: WhatsApp, iconColor: "var(--brand-whatsapp)", onClick: onShareInvoice },
      viewCustomer && { key: "viewCustomer", label: messages.actions.customer.view, icon: PersonRounded, iconColor: "var(--cyan-600)", onClick: onViewCustomer },
      viewCompany && { key: "viewCompany", label: messages.actions.company.view, icon: ApartmentRounded, iconColor: "var(--cyan-600)", onClick: onViewCompany },
      notifyClient && {
        key: "notifyClient",
        label: "Notify Client",
        icon: WhatsApp,
        iconColor: "var(--brand-whatsapp)",
        onClick: onNotifyClient,
        disabled: !isPrintCompleted,
        hint: !isPrintCompleted ? "Available once printing is completed" : undefined,
      },
      download && { key: "download", label: "Download All", icon: DownloadForOfflineRounded, iconColor: "var(--sky-600)", onClick: onDownload },
      preview && { key: "preview", label: "Preview", icon: VisibilityRounded, iconColor: "var(--indigo-500)", onClick: onPreview },
      edit && { key: "edit", label: "Edit", icon: EditRounded, iconColor: "var(--blue-600)", onClick: onEdit },
      toggle && {
        key: "toggle",
        label: isActive ? "Deactivate" : "Activate",
        icon: isActive ? ToggleOnRounded : ToggleOffRounded,
        iconColor: isActive ? "var(--emerald-600)" : "var(--slate-500)",
        onClick: onToggle,
      },
      info && !!data && {
        key: "info",
        label: "Details",
        icon: InfoRounded,
        iconColor: "var(--sky-600)",
        hint: <ProjectDetailsTooltip data={data} />,
        hintSlotProps: detailsTooltipSlotProps,
      },
      del && { key: "delete", label: "Delete", icon: DeleteForeverRounded, iconColor: "var(--rose-600)", onClick: onDelete, destructive: true },
    ];
    const visibleMenuActions = menuActions.filter((a): a is MenuAction => !!a);

    return (
      <Box sx={{ display: "inline-flex", gap: 0.75, alignItems: "center" }}>
        {pinButton}
        <MilestoneButton
          title={isDesignCompleted ? milestoneTitle("Design completed", designCompletedMeta!) : "Mark design as completed"}
          icon={DesignServicesRounded}
          doneIcon={CheckCircleRounded}
          tint={MILESTONE_TINTS.design}
          done={isDesignCompleted}
          ready
          size={size}
          onClick={onMarkDesignCompleted}
        />
        <MilestoneButton
          title={
            isPrintCompleted && printCompletedMeta
              ? milestoneTitle("Print completed", printCompletedMeta)
              : isPrintCompleted
                ? "Print marked as completed"
                : !isDesignCompleted
                  ? "Complete the design first"
                  : "Mark print as completed"
          }
          icon={LocalPrintshopRounded}
          doneIcon={CheckCircleRounded}
          tint={MILESTONE_TINTS.print}
          done={isPrintCompleted}
          ready={canCompletePrint}
          size={size}
          onClick={onMarkPrintCompleted}
        />
        <MilestoneButton
          title={
            isDelivered
              ? milestoneTitle("Delivered", deliveredMeta!)
              : !isDesignCompleted
                ? "Complete the design first"
                : !isPrintCompleted
                  ? "Mark print status as Completed first"
                  : "Mark order as delivered"
          }
          icon={LocalShippingRounded}
          doneIcon={CheckCircleRounded}
          tint={MILESTONE_TINTS.deliver}
          done={isDelivered}
          ready={canDeliver}
          size={size}
          onClick={onMarkDelivered}
        />
        {visibleMenuActions.length > 0 && <MoreActionsMenu size={size} actions={visibleMenuActions} />}
      </Box>
    );
  }

  return (
    <Box sx={{ display: "inline-flex", gap: 0.625, alignItems: "center" }}>
      {pinButton}
      {download && <ActionButton title="Download" icon={DownloadForOfflineRounded} tint={TINTS.sky} size={size} onClick={onDownload} />}
      {preview && <ActionButton title="Preview" icon={VisibilityRounded} tint={TINTS.indigo} size={size} onClick={onPreview} />}
      {viewInvoice && <ActionButton title={messages.actions.invoice.view} icon={VisibilityRounded} tint={TINTS.indigo} size={size} onClick={onViewInvoice} />}
      {shareInvoice && <ActionButton title={messages.actions.invoice.shareWhatsApp} icon={WhatsApp} tint={TINTS.whatsapp} size={size} onClick={onShareInvoice} />}
      {viewCustomer && <ActionButton title={messages.actions.customer.view} icon={PersonRounded} tint={TINTS.cyan} size={size} onClick={onViewCustomer} />}
      {viewCompany && <ActionButton title={messages.actions.company.view} icon={ApartmentRounded} tint={TINTS.cyan} size={size} onClick={onViewCompany} />}
      {downloadDocument && (
        <ActionButton
          title={documentBusy ? messages.actions.document.preparing : messages.actions.document.download}
          icon={FileDownloadRounded}
          tint={TINTS.document}
          size={size}
          onClick={onDownloadDocument}
          disabled={documentBusy}
          disabledOpacity={0.5}
        />
      )}
      {acceptQuotation && (
        <ActionButton
          title={quotationLocked ? messages.actions.quotation.onlyPendingAccept : messages.actions.quotation.accept}
          icon={ThumbUpAltRounded}
          tint={TINTS.emerald}
          size={size}
          onClick={onAcceptQuotation}
          disabled={quotationLocked}
        />
      )}
      {rejectQuotation && (
        <ActionButton
          title={quotationLocked ? messages.actions.quotation.onlyPendingReject : messages.actions.quotation.reject}
          icon={ThumbDownAltRounded}
          tint={TINTS.rose}
          size={size}
          onClick={onRejectQuotation}
          disabled={quotationLocked}
        />
      )}
      {recordPayment && (
        <ActionButton
          title={invoiceLocked ? messages.actions.invoice.onlyPendingPayments : messages.actions.invoice.recordPayment}
          icon={PaymentsRounded}
          tint={TINTS.blue}
          size={size}
          onClick={onRecordPayment}
          disabled={invoiceLocked}
        />
      )}
      {markPaid && (
        <ActionButton
          title={
            invoiceStatus === "paid"
              ? "Already paid"
              : invoiceStatus === "cancelled"
                ? "Cancelled invoices can't be marked paid"
                : messages.actions.invoice.markPaid
          }
          icon={CheckCircleRounded}
          tint={TINTS.emerald}
          size={size}
          onClick={onMarkPaid}
          disabled={invoiceLocked}
        />
      )}
      {cancelInvoice && (
        <ActionButton
          title={invoiceLocked ? messages.actions.invoice.onlyPendingCancel : messages.actions.invoice.cancel}
          icon={CancelRounded}
          tint={TINTS.rose}
          size={size}
          onClick={onCancelInvoice}
          disabled={invoiceLocked}
        />
      )}
      {edit && <ActionButton title="Edit" icon={EditRounded} tint={TINTS.blue} size={size} onClick={onEdit} />}
      {sendPortalInvite && <ActionButton title={messages.actions.customer.sendPortalInvite} icon={PersonAddRounded} tint={TINTS.deepIndigo} size={size} onClick={onSendPortalInvite} />}
      {changePassword && <ActionButton title="Change Password" icon={VpnKeyRounded} tint={TINTS.violet} size={size} onClick={onChangePassword} />}
      {del && <ActionButton title="Delete" icon={DeleteForeverRounded} tint={TINTS.rose} size={size} onClick={onDelete} />}
      {info && data && (
        <Tooltip title={<ProjectDetailsTooltip data={data} />} placement="top" slotProps={detailsTooltipSlotProps}>
          <span>
            <ActionButton title="" icon={InfoRounded} tint={TINTS.sky} size={size} />
          </span>
        </Tooltip>
      )}
      {toggle && (
        <ActionButton
          title={isActive ? "Deactivate" : "Activate"}
          icon={isActive ? ToggleOnRounded : ToggleOffRounded}
          tint={isActive ? TINTS.emerald : TINTS.neutral}
          size={size}
          onClick={onToggle}
        />
      )}
    </Box>
  );
};

export default CrudActions;
