import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button as MuiButton,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import { apiService } from "../../api/service";
import TextField from "../../ui/TextField";
import DateTimePicker from "../../ui/DateTimePicker";
import Dropdown from "../../ui/Dropdown";
import Button from "../../ui/Button";
import AsyncSearchSelect from "../../ui/AsyncSearchSelect";
import ItemLineEditor from "../components/ItemLineEditor";
import { newRow, totalOf, toNumber, piecesOf, type ItemRow, type ItemTypeOption } from "../components/itemLineUtils";
import { useDialogStore } from "../../store/useDialogStore";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import { InvoiceMetaPanel, InvoicePanelLabel, InvoiceTotalCard } from "../../admin/components/InvoiceDocument";

interface CustomerOption {
  id: number;
  first_name: string;
  last_name: string;
}

const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while generating the quotation. Please try again.";
};

const defaultValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
};

// Single-page "New Quotation" screen, same shape as GenerateInvoice.tsx's
// New Job path (see feedback_invoice_zoho_style_atomic_creation memory) -
// customer, job type, line items and totals all on one page with one
// submit. A quotation never needs a project at all (it's a pre-work
// estimate, not a record of work already committed to), so unlike an
// invoice there's no "existing project" mode to offer here.
export default function GenerateQuotation() {
  const navigate = useNavigate();
  const { closeDialog } = useDialogStore();
  const fetchActiveOptions = useListOptionsStore((s) => s.fetchActiveOptions);
  const projectTypeOptions = useListOptionsStore((s) => s.activeByCategory["project_type"]);

  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [projectType, setProjectType] = useState("");
  const [validUntil, setValidUntil] = useState<string | null>(defaultValidUntil());
  const [items, setItems] = useState<ItemRow[]>([newRow()]);
  const [discountAmount, setDiscountAmount] = useState("");
  const [itemTypeOptions, setItemTypeOptions] = useState<ItemTypeOption[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveOptions("project_type");
  }, [fetchActiveOptions]);

  useEffect(() => {
    apiService
      .get<ItemTypeOption[]>("/list-options/", { params: { category: "item_type", active_only: true } })
      .then(setItemTypeOptions)
      .catch((err) => console.error("Failed to load item type catalog", err));
  }, []);

  const grandTotal = useMemo(
    () => Math.round(items.reduce((sum, r) => sum + totalOf(r), 0) * 100) / 100,
    [items]
  );

  const handleGenerate = async () => {
    setSubmitError(null);
    setRowError(null);
    setDiscountError(null);
    setFormError(null);

    if (!customerId || !projectType) {
      setFormError("Pick a customer and a job type before generating the quotation.");
      return;
    }

    const usable: ItemRow[] = [];
    for (const row of items) {
      const filled = [row.width, row.height, row.rate].filter((v) => v.trim() !== "");
      if (filled.length === 0) continue;
      if (
        filled.length < 3 ||
        toNumber(row.width) <= 0 ||
        toNumber(row.height) <= 0 ||
        toNumber(row.rate) < 0 ||
        !Number.isInteger(toNumber(row.pieces)) ||
        toNumber(row.pieces) < 1
      ) {
        setRowError("Each item needs a valid width, height, and rate (rate can be 0, dimensions must be > 0), and a whole number of pieces (1 or more).");
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
      setDiscountError("Discount can't be more than the quotation subtotal.");
      return;
    }

    setSubmitting(true);
    try {
      const quotation = await apiService.post<{ id: number }>("/quotations/", {
        customer_id: customerId,
        project_type: projectType,
        valid_until: validUntil || undefined,
        discount_amount: discount > 0 ? discount : undefined,
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

      closeDialog();
      navigate(`/admin/quotations/${quotation.id}`);
    } catch (err: any) {
      console.error("Error generating quotation", err);
      setSubmitError(extractErrorMessage(err?.response?.data || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // width: "100%" + minWidth: 0 - see the matching comment in
    // GenerateInvoice.tsx; this screen shares the same dialog-flex-item
    // sizing trap.
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
          gap: 1.5,
        }}
      >
        <Box sx={{ p: 1, bgcolor: "var(--violet-50)", borderRadius: 2, color: "var(--violet-600)", display: "flex" }}>
          <RequestQuoteRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--slate-800)" }}>
            Create a Quotation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Send a customer an estimate before any work is committed to - accept it later to turn it straight into a project and invoice.
          </Typography>
        </Box>
      </Paper>

      {/* Customer & Job Panel */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid var(--slate-200)", bgcolor: "var(--white)" }}>
        <InvoiceMetaPanel>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
              <PersonRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InvoicePanelLabel>Quoted To</InvoicePanelLabel>
              <Box sx={{ mt: 0.75 }}>
                <AsyncSearchSelect
                  placeholder="Search customers..."
                  endpoint="/customers"
                  extraParams={{ limit: 20, sort: "most_used" }}
                  getOptionLabel={(c: CustomerOption) => `${c.first_name} ${c.last_name}`}
                  getOptionValue={(c: CustomerOption) => c.id}
                  value={customerId}
                  onChange={(v) => setCustomerId(v as number | undefined)}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: { xs: "flex-start", sm: "flex-end" } }}>
            <Box sx={{ width: { xs: "100%", sm: 220 } }}>
              <DateTimePicker label="Valid Until" value={validUntil} onChange={setValidUntil} placeholder="Optional" />
            </Box>
          </Box>
        </InvoiceMetaPanel>

        <Divider sx={{ my: 2, borderColor: "var(--slate-100)" }} />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <InvoicePanelLabel>Job Type</InvoicePanelLabel>
            <Box sx={{ mt: 0.5 }}>
              <Dropdown
                placeholder="e.g. Flex, Name Board..."
                options={(projectTypeOptions ?? []).map((o) => o.value)}
                value={projectType || undefined}
                onChange={(v) => setProjectType((v as string) || "")}
              />
            </Box>
          </Box>
        </Box>

        {formError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {formError}
          </Alert>
        )}
      </Paper>

      {/* Line Items */}
      <ItemLineEditor items={items} onChange={setItems} itemTypeOptions={itemTypeOptions} />

      {rowError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {rowError}
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
          sx={{ p: 1.5, borderRadius: 2, bgcolor: "var(--slate-50)", border: "1px solid var(--slate-200)", display: "flex", alignItems: "center", gap: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-600)" }}>
            Discount Amount
          </Typography>
          <Box sx={{ width: 140 }}>
            <TextField
              type="number"
              placeholder="0.00"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              sx={{
                "& .MuiInputBase-root": { px: 1, height: 40, fontSize: "0.875rem" },
                "& input": { textAlign: "right" },
              }}
            />
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <InvoiceTotalCard subtotal={grandTotal} discountAmount={toNumber(discountAmount)} />
      </Box>

      {/* Action Footer */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2, borderTop: "1px solid var(--slate-200)" }}>
        <MuiButton
          onClick={closeDialog}
          disabled={submitting}
          sx={{ color: "var(--slate-500)", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "var(--slate-100)" } }}
        >
          Cancel
        </MuiButton>
        <Button onClick={handleGenerate} disabled={submitting} variant="contained">
          {submitting ? "Processing Quotation..." : "Generate Quotation"}
        </Button>
      </Box>
    </Box>
  );
}
