import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";

import { apiService } from "../../api/service";
import { formatDateTime } from "../../format/date";
import { getSemanticColor } from "../../utils/colors";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadQuotationPdf } from "../../utils/downloadDocument";
import { useDialogStore } from "../../store/useDialogStore";
import { useConfirmDialogStore } from "../../hooks/useconfirmDialogStore";
import { useOnDialogClose } from "../../hooks/useOnDialogClose";
import Chip from "../../ui/Chip";
import { semanticChipSx } from "../../ui/chipStyles";
import CrudActions from "../../ui/Actions";
import ListPager from "../../ui/ListPager";
import type { QuotationStatus } from "./quotationSheetUtils";
import { formatRupeesWhole as money } from "../../format/money";

interface QuotationRow {
  id: number;
  quotation_number: string;
  project_type: string | null;
  amount: number;
  status: QuotationStatus;
  valid_until: string | null;
  created_at: string;
}

interface QuotationListResponse {
  items: QuotationRow[];
  total: number;
}

const PAGE_SIZE = 10;

// Same status set and colouring as the quotation view's own.
const statusColor = (status: QuotationStatus) =>
  getSemanticColor(
    "printStatus",
    status === "accepted" || status === "converted" ? "Completed" : status === "rejected" ? "Delayed" : "In Progress",
  );

// One customer's quotations as cards, a page at a time (GET /quotations,
// server-paginated) - the quotations counterpart to CustomerInvoicesList,
// with the same shape: click a card to open the quotation (in a dialog, never
// another page), and the actions live on the card itself - download, accept,
// reject.
export default function CustomerQuotationsList({ customerId }: { customerId: number }) {
  const { openDialog } = useDialogStore();
  const { showDialog } = useConfirmDialogStore();
  const [quotations, setQuotations] = useState<QuotationRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Named (not inlined in the effect) so status changes and the dialog-close
  // hook can re-run it in place without flashing the list back to a spinner.
  const load = () => {
    let active = true;
    apiService
      .get<QuotationListResponse>("/quotations/", {
        params: { customer_id: customerId, page, page_size: PAGE_SIZE },
      })
      .then((res) => {
        if (!active) return;
        setQuotations(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    const cancel = load();
    return () => {
      cancel();
      setQuotations(null);
      setError(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, page]);

  // The quotation dialog (accept / reject / convert from inside it) may have
  // changed a card's status.
  useOnDialogClose(load);

  const decide = (q: QuotationRow, status: "accepted" | "rejected") => {
    const accept = status === "accepted";
    showDialog({
      title: accept ? "Mark quotation as accepted?" : "Mark quotation as rejected?",
      description: `${q.quotation_number} — this can't be undone.`,
      confirmText: accept ? "Mark Accepted" : "Mark Rejected",
      isDestructive: !accept,
      onConfirm: async () => {
        await apiService.patch(`/quotations/${q.id}/status`, { status });
        load();
      },
    });
  };

  const download = async (q: QuotationRow) => {
    setDownloadingId(q.id);
    try {
      await downloadQuotationPdf(q.id);
    } catch (err) {
      showDialog({
        title: "Couldn't download quotation",
        description: getApiErrorMessage(err, "Something went wrong preparing the PDF. Please try again."),
        confirmText: "OK",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (error) {
    return (
      <Typography variant="body2" sx={{ color: "var(--red-600)", py: 1.5, textAlign: "center" }}>
        Couldn't load quotations for this customer.
      </Typography>
    );
  }

  if (quotations === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={22} thickness={5} />
      </Box>
    );
  }

  if (quotations.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, textAlign: "center" }}>
        No quotations raised yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {quotations.map((q) => (
        <Box
          key={q.id}
          role="button"
          tabIndex={0}
          onClick={() => openDialog("viewQuotation", q.id, "view")}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              openDialog("viewQuotation", q.id, "view");
            }
          }}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            bgcolor: "var(--white)",
            border: "1px solid var(--slate-200)",
            cursor: "pointer",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            "&:hover": { borderColor: "var(--blue-300)", boxShadow: "0 1px 6px rgba(37, 99, 235, 0.10)" },
            "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 1 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RequestQuoteRoundedIcon fontSize="small" sx={{ color: "var(--slate-400)", flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-800)", flex: 1, minWidth: 0 }} noWrap>
              {q.quotation_number}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-800)", flexShrink: 0 }}>
              {money(q.amount)}
            </Typography>
            <Chip
              label={q.status === "converted" ? "Converted" : q.status}
              sx={semanticChipSx(statusColor(q.status))}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.5 }}>
              <FolderOpenRoundedIcon sx={{ fontSize: "var(--fs-xl)", color: "var(--slate-400)", flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {q.project_type || "—"}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {q.valid_until ? `Valid until ${formatDateTime(q.valid_until)}` : formatDateTime(q.created_at)}
            </Typography>
          </Box>

          {/* Clicking an action must not also open the card behind it. */}
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <CrudActions
              downloadDocument
              onDownloadDocument={() => download(q)}
              documentBusy={downloadingId === q.id}
              acceptQuotation
              rejectQuotation
              quotationStatus={q.status}
              onAcceptQuotation={() => decide(q, "accepted")}
              onRejectQuotation={() => decide(q, "rejected")}
              size="small"
            />
          </Box>
        </Box>
      ))}

      <Box sx={{ pt: 0.5 }}>
        <ListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </Box>
    </Box>
  );
}
