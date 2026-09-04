import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button as MuiButton,
  CircularProgress,
  IconButton,
  Alert,
  Paper,
  Divider,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import DiscountRoundedIcon from "@mui/icons-material/DiscountRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";

import { apiService } from "../../api/service";
import { formatDate } from "../../utils/dateFormatter";
import TextField from "../../ui/TextField";
import DateTimePicker from "../../ui/DateTimePicker";
import Dropdown from "../../ui/Dropdown";
import Button from "../../ui/Button";
import { useDialogStore } from "../../store/useDialogStore";
import { useProjectStore } from "../../store/useProjectStore";
import {
  InvoiceMetaPanel,
  InvoicePanelLabel,
  InvoiceTotalCard,
} from "../../admin/components/InvoiceDocument";

interface ProjectFileSummary {
  original_name: string | null;
  // A physical-size *estimate* in inches (assumed 96 DPI) - deliberately
  // unused here. See pixel_width/pixel_height below.
  width: number | null;
  height: number | null;
  // The file's actual pixel dimensions - an assumption-free fact, unlike
  // width/height above. Shown to the user as a reference (see the caption
  // under Item Description) instead of auto-filling Width/Height, since a
  // wrong DPI guess would silently feed a wrong size into the invoice
  // total. Width/Height in feet stay entirely user-entered.
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

interface ItemTypeOption {
  id: number;
  value: string;
  rate: number | null;
}

interface ItemRow {
  key: string;
  itemType: string;
  description: string;
  width: string;
  height: string;
  rate: string;
  // The source image's actual pixel size, if this row was seeded from one -
  // display-only (see the caption under Item Description). Width/Height in
  // feet are never derived from this: a raster image's pixel count doesn't
  // imply a physical print size without knowing the file's real DPI, which
  // isn't something the browser can read off an <img> - showing the exact
  // pixel dimensions and letting the user enter the real feet size is more
  // accurate than guessing a DPI and being wrong.
  pixelWidth: number | null;
  pixelHeight: number | null;
}

let rowCounter = 0;
const newRow = (
  description = "",
  pixelWidth: number | null = null,
  pixelHeight: number | null = null
): ItemRow => ({
  key: `row-${++rowCounter}`,
  itemType: "",
  description,
  width: "",
  height: "",
  rate: "",
  pixelWidth,
  pixelHeight,
});

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

const toNumber = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sqFtOf = (row: ItemRow) =>
  row.width && row.height
    ? Math.round(toNumber(row.width) * toNumber(row.height) * 100) / 100
    : 0;

const totalOf = (row: ItemRow) =>
  Math.round(sqFtOf(row) * toNumber(row.rate) * 100) / 100;

const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while generating the invoice. Please try again.";
};

const colHeaderSx = {
  fontWeight: 700,
  fontSize: "0.725rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "#64748B",
  userSelect: "none" as const,
};

// Precise grid layout preventing column drift and layout breaks
const ITEM_ROW_GRID = "28px 170px 1fr 90px 90px 95px 110px 110px 36px";

// Numeric text input constraints preventing clipping and arrow overlapping
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
      color: "#64748B",
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

export default function GenerateInvoice() {
  const navigate = useNavigate();
  const { editingId, closeDialog } = useDialogStore();
  const markDesignCompleted = useProjectStore((s) => s.markDesignCompleted);
  const projectId = editingId;

  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [loading, setLoading] = useState(true);
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

  const totalSqFt = useMemo(
    () => Math.round(items.reduce((sum, r) => sum + sqFtOf(r), 0) * 100) / 100,
    [items]
  );

  const updateRow = (key: string, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };

  // Picking a catalog type re-syncs the rate to it, but leaves the
  // description alone - the description is often already meaningful
  // (auto-seeded from the source image's filename, or something the user
  // already typed), and silently clobbering it just because a type was
  // picked afterward would throw that away.
  const handleItemTypeChange = (key: string, value: string) => {
    const match = itemTypeOptions.find((o) => o.value === value);
    updateRow(key, {
      itemType: value,
      rate: match?.rate != null ? String(match.rate) : "",
    });
  };

  const addRow = () => setItems((prev) => [...prev, newRow()]);

  const removeRow = (key: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const handleGenerate = async () => {
    setSubmitError(null);
    setRowError(null);
    setAdvanceError(null);
    setDiscountError(null);

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
        toNumber(row.rate) < 0
      ) {
        setRowError(
          "Each item needs a valid width, height, and rate (rate can be 0, dimensions must be > 0)."
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
        project_id: Number(projectId),
        due_date: dueDate || undefined,
        discount_amount: discount > 0 ? discount : undefined,
        advance_amount: advance > 0 ? advance : undefined,
        payment_method: advance > 0 ? paymentMethod : undefined,
        payment_reference: paymentReference.trim() || undefined,
        items: usable.map((r) => ({
          description: r.description.trim() || undefined,
          width: toNumber(r.width),
          height: toNumber(r.height),
          rate: toNumber(r.rate),
        })),
      });

      try {
        await markDesignCompleted(String(projectId));
      } catch (err) {
        console.error(
          "Invoice generated, but marking design completed failed",
          err
        );
      }

      closeDialog();
      navigate(`/admin/invoices/${invoice.id}`);
    } catch (err: any) {
      console.error("Error generating invoice", err);
      setSubmitError(extractErrorMessage(err?.response?.data || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Fetching project metadata...
        </Typography>
      </Box>
    );
  }

  if (loadError || !preview) {
    return (
      <Paper elevation={0} sx={{ textAlign: "center", py: 6, px: 3, border: "1px dashed #CBD5E1", borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#475569" }}>
          Unable to Load Project
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          We couldn't retrieve the details for this project preview.
        </Typography>
      </Paper>
    );
  }

  const { project, customer } = preview;
  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`
    : "Unassigned Customer";

  return (
    <Box sx={{ maxWidth: 1040, margin: "0 auto", p: { xs: 1.5, sm: 2.5 } }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          bgcolor: "#F8FAFC",
          border: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ p: 1, bgcolor: "#EFF6FF", borderRadius: 2, color: "#2563EB", display: "flex" }}>
          <ReceiptLongRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1E293B" }}>
            Invoice Generation & Handover
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Generating this invoice automatically updates the project design status to <strong>Completed</strong>.
          </Typography>
        </Box>
      </Paper>

      {/* Billing & Metadata Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
        }}
      >
        <InvoiceMetaPanel>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box sx={{ p: 1, bgcolor: "#F1F5F9", borderRadius: 1.5, color: "#475569", mt: 0.5 }}>
              <PersonRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <InvoicePanelLabel>Billed To</InvoicePanelLabel>
              <Typography sx={{ fontWeight: 700, color: "#0F172A", fontSize: "0.95rem" }}>
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

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Invoice Date:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                {formatDate(new Date().toISOString())}
              </Typography>
            </Box>
            <Box sx={{ width: { xs: "100%", sm: 220 } }}>
              <DateTimePicker label="Due Date" value={dueDate} onChange={setDueDate} placeholder="Optional" />
            </Box>
          </Box>
        </InvoiceMetaPanel>

        <Divider sx={{ my: 2, borderColor: "#F1F5F9" }} />

        {/* Project Summary */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, bgcolor: "#F8FAFC", p: 1.5, borderRadius: 2 }}>
          <FolderOpenRoundedIcon fontSize="small" sx={{ color: "#64748B" }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
            {project.project_type} Order
            {project.description ? ` — ${project.description}` : ""}
          </Typography>
          {project.delivery_date && (
            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
              <EventRoundedIcon sx={{ fontSize: "1rem", color: "#94A3B8" }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Target Delivery: {formatDate(project.delivery_date)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2, borderColor: "#F1F5F9" }} />

        {/* Advance Payment Controls */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box sx={{ p: 1, bgcolor: "#F1F5F9", borderRadius: 1.5, color: "#475569", mt: 0.5 }}>
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

      {/* Dynamic Line Items Section */}
      <Paper elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, overflow: "hidden", mb: 2 }}>
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 920 }}>
            {/* Table Header */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: ITEM_ROW_GRID,
                gap: 1.25,
                bgcolor: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                px: 2,
                py: 1.5,
                alignItems: "center",
              }}
            >
              <Typography sx={colHeaderSx}>#</Typography>
              <Typography sx={colHeaderSx}>Item Type</Typography>
              <Typography sx={colHeaderSx}>Item Description</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Width</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Height</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Area</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Rate</Typography>
              <Typography sx={{ ...colHeaderSx, textAlign: "right" }}>Total Amount</Typography>
              <Box />
            </Box>

            {/* Line Items Rows */}
            <Box>
              {items.map((row, idx) => (
                <Box
                  key={row.key}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: ITEM_ROW_GRID,
                    gap: 1.25,
                    px: 2,
                    py: 1.25,
                    alignItems: "center",
                    borderTop: idx === 0 ? "none" : "1px solid #F1F5F9",
                    bgcolor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "0.8rem" }}>
                    {idx + 1}
                  </Typography>

                  <Dropdown
                    placeholder="Select type"
                    options={itemTypeOptions.map((o) => o.value)}
                    value={row.itemType || undefined}
                    onChange={(v) => handleItemTypeChange(row.key, (v as string) || "")}
                  />

                  <TextField
                    placeholder="Item or Banner details"
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    sx={textFieldSx}
                    fullWidth
                    slotProps={
                      row.pixelWidth && row.pixelHeight
                        ? {
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  {/* Row height must stay identical whether
                                      or not a row has this - a caption line
                                      that only sometimes appears is exactly
                                      what broke row alignment before, so
                                      this rides inside the field instead of
                                      adding a second line beneath it. */}
                                  <Tooltip title={`Source image is ${row.pixelWidth} × ${row.pixelHeight}px — enter the real print size in the fields to the right`}>
                                    <ImageRoundedIcon sx={{ fontSize: 16, color: "#94A3B8" }} />
                                  </Tooltip>
                                </InputAdornment>
                              ),
                            },
                          }
                        : undefined
                    }
                  />
                  <TextField
                    type="number"
                    placeholder="0"
                    value={row.width}
                    onChange={(e) => updateRow(row.key, { width: e.target.value })}
                    sx={numberFieldSx}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">ft</InputAdornment>,
                      },
                    }}
                  />

                  <TextField
                    type="number"
                    placeholder="0"
                    value={row.height}
                    onChange={(e) => updateRow(row.key, { height: e.target.value })}
                    sx={numberFieldSx}
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">ft</InputAdornment>,
                      },
                    }}
                  />

                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155", textAlign: "right", pr: 0.5, fontSize: "0.85rem" }}>
                    {sqFtOf(row)}{" "}
                    <Typography component="span" sx={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 500 }}>
                      sq ft
                    </Typography>
                  </Typography>

                  <TextField
                    type="number"
                    placeholder="0.00"
                    value={row.rate}
                    onChange={(e) => updateRow(row.key, { rate: e.target.value })}
                    sx={numberFieldSx}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                  />

                  <Typography sx={{ fontWeight: 700, textAlign: "right", color: "#0F172A", fontSize: "0.875rem", pr: 0.5 }}>
                    ₹{totalOf(row).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>

                  <Tooltip title={items.length === 1 ? "Minimum 1 item required" : "Remove item"}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => removeRow(row.key)}
                        disabled={items.length === 1}
                        sx={{
                          color: "#94A3B8",
                          "&:hover": { color: "#EF4444", bgcolor: "#FEF2F2" },
                          "&.Mui-disabled": { opacity: 0.3 },
                        }}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Row Control & Quick Calculations */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <MuiButton
          size="medium"
          startIcon={<AddRoundedIcon />}
          onClick={addRow}
          disableRipple
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "#2563EB",
            bgcolor: "#EFF6FF",
            px: 2,
            py: 0.8,
            borderRadius: 2,
            "&:hover": { bgcolor: "#DBEAFE" },
          }}
        >
          Add Item Line
        </MuiButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
          <CalculateRoundedIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Total Printable Area: <strong>{totalSqFt} sq ft</strong>
          </Typography>
        </Box>
      </Box>

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
            bgcolor: "#F8FAFC",
            border: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#475569" }}>
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
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2, borderTop: "1px solid #E2E8F0" }}>
        <MuiButton
          onClick={closeDialog}
          disabled={submitting}
          sx={{
            color: "#64748B",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: "#F1F5F9" },
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