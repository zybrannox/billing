import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button as MuiButton,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  InputAdornment,
} from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import DiscountRoundedIcon from "@mui/icons-material/DiscountRounded";

import { apiService } from "../../api/service";
import { formatDate } from "../../utils/dateFormatter";
import TextField from "../../ui/TextField";
import DateTimePicker from "../../ui/DateTimePicker";
import Dropdown from "../../ui/Dropdown";
import Button from "../../ui/Button";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";
import ItemLineEditor from "../components/ItemLineEditor";
import {
  newRow,
  totalOf,
  toNumber,
  piecesOf,
  type ItemRow,
  type ItemTypeOption,
} from "../components/itemLineUtils";
import { useDialogStore } from "../../store/useDialogStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import {
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
} from "../../admin/components/InvoiceDocument";

interface ProjectFileSummary {
  original_name: string | null;
  width: number | null;
  height: number | null;
  pixel_width: number | null;
  pixel_height: number | null;
}

interface ProjectSummary {
  id: number;
  project_type: string;
  description: string | null;
  start_date: string | null;
  delivery_date: string | null;
  files: ProjectFileSummary[];
}

interface CustomerSummary {
  first_name: string;
  last_name: string;
  contact_number: string;
  email: string;
}

interface InvoicePreview {
  project: ProjectSummary;
  customer: CustomerSummary | null;
}

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
      f.pixel_height
    )
  );
};

const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while generating the invoice. Please try again.";
};

const numberFieldSx = {
  "& .MuiInputBase-root": {
    px: 1,
    height: 40,
    fontSize: "0.875rem",
  },
  "& input": {
    textAlign: "right" as const,
    px: 0.5,
    py: 0.75,
  },
  "& input[type=number]": {
    MozAppearance: "textfield" as const,
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
    WebkitAppearance: "none",
    margin: 0,
  },
  "& .MuiInputAdornment-root": {
    m: 0,
    "& .MuiTypography-root": {
      fontSize: "0.75rem",
      color: "var(--slate-500)",
      fontWeight: 600,
    },
  },
};

const textFieldSx = {
  "& .MuiInputBase-root": {
    px: 1.25,
    height: 40,
    fontSize: "0.875rem",
  },
  "& input": {
    py: 0.75,
  },
};

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];

interface ProjectOption {
  id: number;
  project_type: string;
  customer_name: string | null;
  assigned_to: string;
}

interface CustomerOption {
  id: number;
  first_name: string;
  last_name: string;
}

export default function GenerateInvoice() {
  const { editingId, closeDialog, openDialog } = useDialogStore();
  const markDesignCompleted = useProjectStore((s) => s.markDesignCompleted);
  const fetchActiveOptions = useListOptionsStore((s) => s.fetchActiveOptions);
  const projectTypeOptions = useListOptionsStore((s) => s.activeByCategory["project_type"]);

  // Three ways this screen is reached:
  // 1. A specific project's own "Mark Design Completed" row action
  //    (editingId set) - always an existing, already-tracked project.
  // 2. The header "Create Invoice" shortcut, "Existing Project" mode - pick
  //    an already-tracked project that just hasn't been invoiced yet.
  // 3. The header shortcut's default, "New Job" mode - like Zoho Books'
  //    New Invoice screen: just who it's billed to and what it's for
  //    (customer, job type) are entered right here, on the exact same page
  //    and the exact same Generate Invoice submit as the line items and
  //    total - not a separate "create a project first" screen, and not a
  //    work-tracking form (no assignee/dates/priority - see the New Job
  //    fields below). The project and invoice are created together,
  //    server-side, in one request (see app/invoices/repository.py's
  //    create_invoice handling `new_project`).
  const [mode, setMode] = useState<"new" | "existing">("new");
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
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [itemTypeOptions, setItemTypeOptions] = useState<ItemTypeOption[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState<number | undefined>(undefined);

  // New Job fields - only read/used while isNewJob. Just who it's billed
  // to and what it's for, like a real invoice - no work-tracking fields
  // (assignee, priority, client status, schedule dates) and no free-text
  // description (a real invoice doesn't carry one - the line items already
  // say what's billed); those get fixed sensible defaults server-side (see
  // app/invoices/repository.py's create_invoice) since this project exists
  // only to hang the invoice off of.
  const [newProjectType, setNewProjectType] = useState("");
  const [newCustomerId, setNewCustomerId] = useState<number | undefined>(undefined);
  const [newJobError, setNewJobError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveOptions("project_type");
  }, [fetchActiveOptions]);

  useEffect(() => {
    apiService
      .get<ItemTypeOption[]>("/list-options/", { params: { category: "item_type", active_only: true } })
      .then(setItemTypeOptions)
      .catch((err) => console.error("Failed to load item type catalog", err));
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
    () => Math.round(items.reduce((sum, r) => sum + totalOf(r), 0) * 100) / 100,
    [items]
  );

  const handleGenerate = async () => {
    setSubmitError(null);
    setRowError(null);
    setAdvanceError(null);
    setDiscountError(null);
    setNewJobError(null);

    if (isNewJob && (!newProjectType || !newCustomerId)) {
      setNewJobError("Pick a job type and a customer before generating.");
      return;
    }

    const usable: ItemRow[] = [];
    for (const row of items) {
      const filled = [row.width, row.height, row.rate].filter(
        (v) => v.trim() !== ""
      );
      if (filled.length === 0) continue;
      if (
        filled.length < 3 ||
        toNumber(row.width) <= 0 ||
        toNumber(row.height) <= 0 ||
        toNumber(row.rate) < 0 ||
        !Number.isInteger(toNumber(row.pieces)) ||
        toNumber(row.pieces) < 1
      ) {
        setRowError(
          "Each item needs a valid width, height, and rate (rate can be 0, dimensions must be > 0), and a whole number of pieces (1 or more)."
        );
        return;
      }
      usable.push(row);
    }

    if (usable.length === 0) {
      setRowError("Add at least one item with standard dimensions and a rate.");
      return;
    }

    const subtotal = Math.round(usable.reduce((sum, r) => sum + totalOf(r), 0) * 100) / 100;

    const discount = toNumber(discountAmount);
    if (discountAmount.trim() !== "" && discount > subtotal) {
      setDiscountError("Discount can't be more than the invoice subtotal.");
      return;
    }
    const totalAfterDiscount = Math.round((subtotal - discount) * 100) / 100;

    const advance = toNumber(advanceAmount);
    if (advanceAmount.trim() !== "" && advance > 0) {
      if (!paymentMethod) {
        setAdvanceError("Pick a payment method for the advance received.");
        return;
      }
      if (advance > totalAfterDiscount) {
        setAdvanceError("Advance received can't be more than the invoice total.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const invoice = await apiService.post<{ id: number }>("/invoices/", {
        ...(isNewJob
          ? {
              new_project: {
                project_type: newProjectType,
                customer_id: newCustomerId,
              },
            }
          : { project_id: Number(projectId) }),
        due_date: dueDate || undefined,
        discount_amount: discount > 0 ? discount : undefined,
        advance_amount: advance > 0 ? advance : undefined,
        payment_method: advance > 0 ? paymentMethod : undefined,
        payment_reference: paymentReference.trim() || undefined,
        items: usable.map((r) => ({
          description: r.description.trim() || undefined,
          width: toNumber(r.width),
          height: toNumber(r.height),
          unit: r.unit,
          rate: toNumber(r.rate),
          pieces: piecesOf(r),
          is_manual_total: r.total !== "",
        })),
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
            alert(
              `Invoice ${invoice.id} was created, but this project couldn't be marked "design completed" automatically. Mark it manually from Projects - Generate Invoice will otherwise refuse a second one for this order.`,
            );
          }
        }
      }

      closeDialog();
      openDialog("viewInvoice", invoice.id, "view");
    } catch (err: any) {
      console.error("Error generating invoice", err);
      setSubmitError(extractErrorMessage(err?.response?.data || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Header banner + New Job/Existing Project toggle - shown whenever no
  // project is settled on yet (not reachable at all once opened via a
  // specific project's own row action, since editingId already answers
  // this question).
  const modeToggle = !editingId && (
    <Box sx={{ display: "flex", bgcolor: "var(--slate-100)", borderRadius: 999, p: 0.5, gap: 0.5, flexShrink: 0 }}>
      {(["new", "existing"] as const).map((m) => {
        const active = m === mode;
        return (
          <Box
            key={m}
            component="button"
            type="button"
            onClick={() => setMode(m)}
            sx={{
              border: "none",
              px: 2,
              py: 0.75,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
              fontFamily: "inherit",
              color: active ? "var(--white)" : "var(--slate-500)",
              bgcolor: active ? "var(--slate-900)" : "transparent",
              transition: "all 0.15s ease",
              "&:hover": { color: active ? "var(--white)" : "var(--slate-900)" },
            }}
          >
            {m === "new" ? "New Job" : "Existing Project"}
          </Box>
        );
      })}
    </Box>
  );

  if (showExistingPicker) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: "var(--blue-50)", borderRadius: 2, color: "var(--blue-600)", display: "flex" }}>
              <ReceiptLongRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "var(--slate-800)" }}>
                Create an Invoice
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Search for the project you want to invoice
              </Typography>
            </Box>
          </Box>
          {modeToggle}
        </Box>

        <AsyncSearchSelect
          label="Project"
          placeholder="Search by project type, customer, assignee..."
          endpoint="/projects"
          extraParams={{ page_size: 20 }}
          getOptionLabel={(p: ProjectOption) =>
            `${p.project_type}${p.customer_name ? ` — ${p.customer_name}` : ""} (${p.assigned_to})`
          }
          getOptionValue={(p: ProjectOption) => p.id}
          value={selectedExistingId}
          onChange={(v) => setSelectedExistingId(v as number | undefined)}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3, pt: 2, borderTop: "1px solid var(--slate-200)" }}>
          <MuiButton
            onClick={closeDialog}
            sx={{ color: "var(--slate-500)", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "var(--slate-100)" } }}
          >
            Cancel
          </MuiButton>
          <Button
            onClick={() => selectedExistingId && setResolvedProjectId(selectedExistingId)}
            disabled={!selectedExistingId}
            variant="contained"
          >
            Continue
          </Button>
        </Box>
      </Box>
    );
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
  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`
    : "Unassigned Customer";

  return (
    // width: "100%" + minWidth: 0 - this is a flex item of the
    // invoiceDesignComplete dialog's DialogContent (see ui/Dialog.tsx),
    // and a flex item with auto horizontal margins (the centering trick
    // below) opts out of the default cross-axis stretch - without an
    // explicit width it shrink-to-fits its own content instead of
    // filling the dialog, so the line-item table's minWidth: 960 (see
    // ItemLineEditor.tsx) forces this box - and the dialog around it -
    // wider than the viewport instead of ever reaching ItemLineEditor's
    // own horizontal scrollbar.
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
                ? "For name boards, signage, or any other job - a design file isn't required"
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
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
                <PersonRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <InvoicePanelLabel>Billed To</InvoicePanelLabel>
                <Box sx={{ mt: 0.75 }}>
                  <AsyncSearchSelect
                    placeholder="Search customers..."
                    endpoint="/customers"
                    extraParams={{ limit: 20, sort: "most_used" }}
                    getOptionLabel={(c: CustomerOption) => `${c.first_name} ${c.last_name}`}
                    getOptionValue={(c: CustomerOption) => c.id}
                    value={newCustomerId}
                    onChange={(v) => setNewCustomerId(v as number | undefined)}
                  />
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
                <PersonRoundedIcon fontSize="small" />
              </Box>
              <Box>
                <InvoicePanelLabel>Billed To</InvoicePanelLabel>
                <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "0.95rem" }}>
                  {customerName}
                </Typography>
                {customer && (
                  <Box sx={{ mt: 0.25 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                      {customer.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                      {customer.contact_number}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
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
              <InvoicePanelLabel>Job Type</InvoicePanelLabel>
              <Box sx={{ mt: 0.5 }}>
                <Dropdown
                  placeholder="e.g. Flex, Name Board..."
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
                  <EventRoundedIcon sx={{ fontSize: "1rem", color: "var(--slate-400)" }} />
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
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
            <PaymentsRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <InvoicePanelLabel>Advance Payment (optional)</InvoicePanelLabel>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1 }}>
              <Box sx={{ width: 140 }}>
                <TextField
                  type="number"
                  placeholder="0.00"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  sx={numberFieldSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>
              <Box sx={{ width: 180 }}>
                <Dropdown
                  placeholder="Payment method"
                  options={PAYMENT_METHODS}
                  value={paymentMethod || undefined}
                  onChange={(v) => setPaymentMethod((v as string) || "")}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  placeholder="Reference / note (optional)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  sx={textFieldSx}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Dynamic Line Items Section - shared with GenerateQuotation.tsx,
          see common/components/ItemLineEditor.tsx */}
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
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "var(--slate-50)",
            border: "1px solid var(--slate-200)",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--slate-600)" }}>
            <DiscountRoundedIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Discount Amount
            </Typography>
          </Box>
          <Box sx={{ width: 140 }}>
            <TextField
              type="number"
              placeholder="0.00"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              sx={numberFieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Paper>
      </Box>

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
