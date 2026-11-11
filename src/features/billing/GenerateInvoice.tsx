import { notify } from "../../store/useNoticeStore";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button as MuiButton,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";

import { apiService } from "../../api/service";
import { formatDate } from "../../format/date";
import DateTimePicker from "../../ui/DateTimePicker";
import SearchSelect from "../../ui/SearchSelect";
import Button from "../../ui/Button";
import ItemLineEditor from "./ItemLineEditor";
import { noteToLines } from "../notes/noteLines";
import {
  newRow,
  toNumber,
  collectRows,
  subtotalOf,
  rowToItemPayload,
  type ItemRow,
  type ItemTypeOption,
} from "./itemLineUtils";
import { useDialogStore } from "../../store/useDialogStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import {
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
} from "../../ui/InvoiceDocument";
import { messages } from "../../messages";
import type { InvoicePreview, InvoiceProject as ProjectSummary, InvoiceProjectFile as ProjectFileSummary } from "../../api/types";
import { getErrorMessage } from "../../utils/apiError";
import AdvancePaymentFields from "./generateInvoice/AdvancePaymentFields";
import { BilledToPicker, BilledToSummary } from "./generateInvoice/BilledTo";
import { customerChoicePayload, customerChoiceProblem, emptyCustomerChoice } from "./generateInvoice/customerChoiceRules";
import DiscountField from "./generateInvoice/DiscountField";
import ExistingProjectPicker from "./generateInvoice/ExistingProjectPicker";
import InvoiceModeToggle, { type InvoiceMode } from "./generateInvoice/InvoiceModeToggle";
import { checkInvoiceAmounts } from "./generateInvoice/invoiceAmounts";

const stripExtension = (name: string) => name.replace(/\.[^./\\]+$/, "");

const buildInitialRows = (project: ProjectSummary): ItemRow[] => {
  const named = project.files.filter(
    (f): f is ProjectFileSummary & { original_name: string } => !!f.original_name
  );
  if (named.length === 0) return [newRow(project.project_type)];
  return named.map((f) =>
    newRow(
      `${project.project_type} – ${stripExtension(f.original_name)}`,
      f.pixel_width,
      f.pixel_height,
      f.id
    )
  );
};

export default function GenerateInvoice() {
  const { editingId, closeDialog, openDialog } = useDialogStore();
  // Read once: the store clears it as this dialog closes, while a slow submit may
  // still need it.
  const [billingNote] = useState(() => useDialogStore.getState().billingNote);
  const markDesignCompleted = useProjectStore((s) => s.markDesignCompleted);
  const fetchActiveOptions = useListOptionsStore((s) => s.fetchActiveOptions);
  const projectTypeOptions = useListOptionsStore((s) => s.activeByCategory["project_type"]);

  // Three ways this screen is reached:
  // 1. A specific project's own "Mark Design Completed" row action
  //    (editingId set) - always an existing, already-tracked project.
  // 2. The header "Create Invoice" shortcut, "Existing Project" mode - pick
  //    an already-tracked project that just hasn't been invoiced yet.
  // 3. The header shortcut's default, "Create bill" mode (New Job in the code) - like Zoho Books'
  //    New Invoice screen: just who it's billed to and what it's for
  //    (customer, job type) are entered right here, on the exact same page
  //    and the exact same Generate Invoice submit as the line items and
  //    total - not a separate "create a project first" screen, and not a
  //    work-tracking form (no assignee/dates/priority - see the New Job
  //    fields below). The project and invoice are created together,
  //    server-side, in one request (see app/invoices/repository.py's
  //    create_invoice handling `new_project`).
  const [mode, setMode] = useState<InvoiceMode>("new");
  const [resolvedProjectId, setResolvedProjectId] = useState<number | null>(null);
  const projectId = editingId ?? resolvedProjectId;
  const isNewJob = !projectId && mode === "new";
  const showExistingPicker = !projectId && mode === "existing";

  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>(() => {
    const lines = billingNote ? noteToLines(billingNote.text) : [];
    return lines.length > 0 ? lines.map((line) => newRow(line)) : [newRow()];
  });
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [itemTypeOptions, setItemTypeOptions] = useState<ItemTypeOption[]>([]);

  // New Job fields - only read/used while isNewJob. Just who it's billed
  // to and what it's for, like a real invoice - no work-tracking fields
  // (assignee, priority, client status, schedule dates) and no free-text
  // description (a real invoice doesn't carry one - the line items already
  // say what's billed); those get fixed sensible defaults server-side (see
  // app/invoices/repository.py's create_invoice) since this project exists
  // only to hang the invoice off of.
  const [newProjectType, setNewProjectType] = useState("");
  const [customerChoice, setCustomerChoice] = useState(() => emptyCustomerChoice(billingNote?.customerId));
  const [newJobError, setNewJobError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveOptions("project_type");
  }, [fetchActiveOptions]);

  useEffect(() => {
    apiService
      .get<ItemTypeOption[]>("/list-options/", { params: { category: "item_type", active_only: true } })
      .then(setItemTypeOptions)
      .catch((err) => console.error(messages.errors.itemCatalogLoad, err));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    apiService
      .get<InvoicePreview>(`/invoices/preview/${projectId}`)
      .then((data) => {
        if (!active) return;
        setPreview(data);
        setItems(buildInitialRows(data.project));
        // Defaults the invoice's due date to the project's delivery date -
        // the two are the same date for the overwhelming majority of jobs
        // (payment is due on handover), and it's still just a starting
        // point: freely editable via the picker below like any manual
        // entry.
        setDueDate(data.project.delivery_date);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const grandTotal = useMemo(
    () => subtotalOf(items),
    [items]
  );

  const handleGenerate = async () => {
    setSubmitError(null);
    setRowError(null);
    setAdvanceError(null);
    setDiscountError(null);
    setNewJobError(null);

    const customerProblem = isNewJob ? customerChoiceProblem(customerChoice) : null;
    if (customerProblem) {
      setNewJobError(customerProblem);
      return;
    }

    const { rows: usable, error: rowProblem } = collectRows(items);
    if (rowProblem) {
      setRowError(rowProblem);
      return;
    }

    const amountProblems = checkInvoiceAmounts({ subtotal: subtotalOf(usable), discountAmount, advanceAmount, paymentMethod });
    if (amountProblems.discountError || amountProblems.advanceError) {
      setDiscountError(amountProblems.discountError ?? null);
      setAdvanceError(amountProblems.advanceError ?? null);
      return;
    }
    const discount = toNumber(discountAmount);
    const advance = toNumber(advanceAmount);

    setSubmitting(true);
    try {
      const invoice = await apiService.post<{ id: number }>("/invoices/", {
        ...(isNewJob
          ? {
              new_project: {
                project_type: newProjectType || undefined,
                ...customerChoicePayload(customerChoice),
              },
            }
          : { project_id: Number(projectId) }),
        note_id: billingNote?.id,
        due_date: dueDate || undefined,
        discount_amount: discount > 0 ? discount : undefined,
        advance_amount: advance > 0 ? advance : undefined,
        payment_method: advance > 0 ? paymentMethod : undefined,
        payment_reference: paymentReference.trim() || undefined,
        items: usable.map(rowToItemPayload),
      });

      // Only an *existing* project needs its own "design completed"
      // milestone flipped after the fact - a brand-new one created via
      // new_project is marked design_completed_at server-side at the same
      // time it's created (see repository.create_invoice), since there
      // was never a separate design phase to close out for a job that
      // didn't exist as a project until this exact invoice.
      if (!isNewJob) {
        try {
          await markDesignCompleted(String(projectId));
        } catch {
          try {
            await markDesignCompleted(String(projectId));
          } catch (err) {
            console.error(
              "Invoice generated, but marking design completed failed twice",
              err,
            );
            notify.warning("Invoice created, but the project wasn't updated", {
              message: `Mark this project "design completed" yourself from Projects. Until then, Generate Invoice will refuse a second invoice for this order.`,
            });
          }
        }
      }

      closeDialog();
      openDialog("viewInvoice", invoice.id, "view");
    } catch (err) {
      console.error("Error generating invoice", err);
      setSubmitError(getErrorMessage(err, "Something went wrong while generating the invoice. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // Header banner + New Job/Existing Project toggle - shown whenever no
  // project is settled on yet (not reachable at all once opened via a
  // specific project's own row action, since editingId already answers
  // this question).
  const modeToggle = !editingId && <InvoiceModeToggle mode={mode} onChange={setMode} />;

  if (showExistingPicker) {
    return <ExistingProjectPicker modeToggle={modeToggle} onCancel={closeDialog} onContinue={setResolvedProjectId} />;
  }

  if (projectId && loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Fetching project metadata...
        </Typography>
      </Box>
    );
  }

  if (projectId && (loadError || !preview)) {
    return (
      <Paper elevation={0} sx={{ textAlign: "center", py: 6, px: 3, border: "1px dashed var(--slate-300)", borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "var(--slate-600)" }}>
          Unable to Load Project
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          We couldn't retrieve the details for this project preview.
        </Typography>
      </Paper>
    );
  }

  const project = preview?.project;
  const customer = preview?.customer;

  return (
    // width: "100%" + minWidth: 0 - this is a flex item of the
    // invoiceDesignComplete dialog's DialogContent (see ui/Dialog.tsx),
    // and a flex item with auto horizontal margins (the centering trick
    // below) opts out of the default cross-axis stretch - without an
    // explicit width it shrink-to-fits its own content instead of
    // filling the dialog, and ItemLineEditor's layout responds to the width
    // it's given (see its container queries).
    <Box sx={{ width: "100%", maxWidth: 1280, minWidth: 0, margin: "0 auto", p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          bgcolor: "var(--slate-50)",
          border: "1px solid var(--slate-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ p: 1, bgcolor: "var(--blue-50)", borderRadius: 2, color: "var(--blue-600)", display: "flex" }}>
            <ReceiptLongRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--slate-800)" }}>
              {isNewJob ? "Create an Invoice" : "Invoice Generation & Handover"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isNewJob
                ? "Who it's for and what's billed. This won't add a project."
                : (
                  <>Generating this invoice automatically updates the project design status to <strong>Completed</strong>.</>
                )}
            </Typography>
          </Box>
        </Box>
        {modeToggle}
      </Paper>

      {/* Billing & Metadata Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: "1px solid var(--slate-200)",
          bgcolor: "var(--white)",
        }}
      >
        <InvoiceMetaPanel>
          {isNewJob ? (
            <BilledToPicker value={customerChoice} onChange={setCustomerChoice} />
          ) : (
            <BilledToSummary customer={customer} />
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Invoice Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
                {formatDate(new Date().toISOString())}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 220 } }}>
              <DateTimePicker label="Due Date" value={dueDate} onChange={setDueDate} placeholder="Optional" />
            </Box>
          </Box>
        </InvoiceMetaPanel>

        <Divider sx={{ my: 2, borderColor: "var(--slate-100)" }} />

        {isNewJob ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ maxWidth: 320 }}>
              <InvoicePanelLabel>Job Type (optional)</InvoicePanelLabel>
              <Box sx={{ mt: 0.5 }}>
                <SearchSelect
                  placeholder="Search job type, e.g. Flex, Name Board..."
                  options={(projectTypeOptions ?? []).map((o) => o.value)}
                  value={newProjectType || undefined}
                  onChange={(v) => setNewProjectType((v as string) || "")}
                />
              </Box>
            </Box>

            {newJobError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {newJobError}
              </Alert>
            )}
          </Box>
        ) : (
          project && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, bgcolor: "var(--slate-50)", p: 1.5, borderRadius: 2 }}>
              <FolderOpenRoundedIcon fontSize="small" sx={{ color: "var(--slate-500)" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }}>
                {project.project_type} Order
              </Typography>
              {project.delivery_date && (
                <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <EventRoundedIcon sx={{ fontSize: "var(--fs-xl)", color: "var(--slate-400)" }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Target Delivery: {formatDate(project.delivery_date)}
                  </Typography>
                </Box>
              )}
            </Box>
          )
        )}

        <Divider sx={{ my: 2, borderColor: "var(--slate-100)" }} />

        {/* Advance Payment Controls */}
        <AdvancePaymentFields
          amount={advanceAmount}
          method={paymentMethod}
          reference={paymentReference}
          onAmountChange={setAdvanceAmount}
          onMethodChange={setPaymentMethod}
          onReferenceChange={setPaymentReference}
        />
      </Paper>

      {billingNote && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Started from your note: each line of it is a row below. Add the sizes and rates, then create the invoice.
        </Alert>
      )}

      {/* Dynamic Line Items Section - shared with GenerateQuotation.tsx,
          see features/billing/ItemLineEditor.tsx */}
      <ItemLineEditor items={items} onChange={setItems} itemTypeOptions={itemTypeOptions} />

      {/* Validation Alert Notices */}
      {rowError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {rowError}
        </Alert>
      )}

      {advanceError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {advanceError}
        </Alert>
      )}

      {discountError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {discountError}
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      {/* Discount Sub-Panel */}
      <DiscountField value={discountAmount} onChange={setDiscountAmount} />

      {/* Invoice Grand Total Summary Card */}
      <Box sx={{ mb: 4 }}>
        <InvoiceTotalCard
          subtotal={grandTotal}
          discountAmount={toNumber(discountAmount)}
          advanceAmount={toNumber(advanceAmount)}
          paymentMethod={paymentMethod || undefined}
        />
      </Box>

      {/* Action Footer */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2, borderTop: "1px solid var(--slate-200)" }}>
        <MuiButton
          onClick={closeDialog}
          disabled={submitting}
          sx={{
            color: "var(--slate-500)",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "var(--slate-100)" },
          }}
        >
          Cancel
        </MuiButton>
        <Button onClick={handleGenerate} disabled={submitting} variant="contained">
          {submitting ? "Processing Invoice..." : "Generate Invoice"}
        </Button>
      </Box>
    </Box>
  );
}
