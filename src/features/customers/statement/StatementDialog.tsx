import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { saveAs } from "file-saver";
import { apiService } from "../../../api/service";
import type { CustomerStatement } from "../../../api/types";
import FilterPill from "../../../ui/FilterPill";
import ListState from "../../../ui/ListState";
import { GenericDialog } from "../../../ui/Dialog";
import { generateInvoicePdf } from "../../documents/generateInvoicePdf";
import { printDocument } from "../../documents/printDocument";
import StatementSheet from "../../documents/StatementSheet";
import { STATEMENT_PERIODS, periodLabel, periodRange, type StatementPeriod } from "./statementPeriod";

// A customer's statement for a chosen period, ready to print or save as a PDF.
export default function StatementDialog({
  customerId,
  customerName,
  open,
  onClose,
}: {
  customerId: number;
  customerName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<StatementPeriod>("this_month");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Taken when the dialog renders, so a statement opened just before midnight
  // keeps meaning the day it was opened.
  const [now] = useState(() => new Date());
  const { from, to } = periodRange(period, now);

  const query = useQuery({
    queryKey: ["customer-statement", customerId, period],
    queryFn: () =>
      apiService.get<CustomerStatement>(`/customers/${customerId}/statement`, {
        params: { date_from: from?.toISOString(), date_to: to?.toISOString() },
      }),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const download = async () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    setSaving(true);
    setError(null);
    // The on-screen card's border has no place on the saved page.
    const { border, borderRadius } = sheet.style;
    Object.assign(sheet.style, { border: "none", borderRadius: "0" });
    try {
      const label = STATEMENT_PERIODS.find((p) => p.value === period)?.label ?? "";
      const file = await generateInvoicePdf(sheet, `Statement-${customerName}-${label}.pdf`.replace(/\s+/g, "-"));
      saveAs(file, file.name);
    } catch (err) {
      console.error("Couldn't save the statement", err);
      setError("Couldn't save the PDF. Please try again.");
    } finally {
      Object.assign(sheet.style, { border, borderRadius });
      setSaving(false);
    }
  };

  const ready = !!query.data && !query.isFetching;

  return (
    <GenericDialog open={open} onClose={onClose} title="Customer statement" subtitle={customerName} maxWidth="md" fullWidth>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {STATEMENT_PERIODS.map((p) => (
            <FilterPill key={p.value} label={p.label} active={period === p.value} onClick={() => setPeriod(p.value)} />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={saving ? <CircularProgress size={14} /> : <DownloadRoundedIcon />}
            disabled={!ready || saving}
            onClick={download}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px" }}
          >
            Download PDF
          </Button>
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={<PrintRoundedIcon />}
            disabled={!ready}
            onClick={() => sheetRef.current && printDocument(sheetRef.current)}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "8px", bgcolor: "var(--slate-900)", "&:hover": { bgcolor: "var(--slate-800)" } }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: "10px" }}>
          {error}
        </Alert>
      )}

      {query.data ? (
        <Box sx={{ opacity: query.isFetching ? 0.5 : 1, transition: "opacity 0.15s ease" }}>
          <StatementSheet ref={sheetRef} statement={query.data} period={periodLabel(period, now)} />
        </Box>
      ) : (
        <ListState loading={query.isPending} error={query.isError} empty={false} errorText="Couldn't load the statement." emptyText="" />
      )}
    </GenericDialog>
  );
}
