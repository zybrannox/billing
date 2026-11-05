import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Dialog, IconButton, InputBase, Tooltip, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { apiService } from "../../api/service";
import type { InvoiceListResponse } from "../../api/types";
import { formatRupees } from "../../format/money";
import { shortcutLabel } from "../../utils/platform";
import InvoiceStatusChip from "./InvoiceStatusChip";
import { billingKeys } from "./queries";

const RESULT_LIMIT = 8;
const SHORTCUT = shortcutLabel("K");

const paramsFor = (search: string) =>
  search ? { search, page: 1, page_size: RESULT_LIMIT } : { view: "unpaid", page: 1, page_size: RESULT_LIMIT };

const fetchResults = (params: object) => apiService.get<InvoiceListResponse>("/invoices/", { params });

// Jump straight to any invoice from any screen: type what you know (number,
// name, phone or job) and press Enter. With nothing typed yet it offers what
// still needs chasing.
export default function InvoiceQuickSearch() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = pathname.startsWith("/admin") ? "/admin/invoices" : "/invoices";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 200);
    return () => clearTimeout(timer);
  }, [text]);

  const queryClient = useQueryClient();
  const params = paramsFor(search);
  const query = useQuery({
    queryKey: billingKeys.invoiceList(params),
    queryFn: () => fetchResults(params),
    enabled: open,
    placeholderData: keepPreviousData,
  });
  const results = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    setText("");
    setSearch("");
  };

  const openInvoice = (id: number) => {
    close();
    navigate(`${base}/${id}`);
  };

  const seeAll = () => {
    const term = search;
    close();
    navigate(term ? `${base}?q=${encodeURIComponent(term)}` : base);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const term = text.trim();
      if (term === search && !query.isPlaceholderData) {
        if (results[active]) openInvoice(results[active].id);
        return;
      }
      // Typed faster than the list updates: what's on screen is still the last
      // search, so open the best match for what's typed now instead.
      const latest = paramsFor(term);
      queryClient
        .fetchQuery({ queryKey: billingKeys.invoiceList(latest), queryFn: () => fetchResults(latest) })
        .then((data) => {
          if (data.items[0]) openInvoice(data.items[0].id);
          else setSearch(term);
        })
        .catch(() => setSearch(term));
    }
  };

  return (
    <>
      <Tooltip title={`Search invoices (${SHORTCUT})`}>
        <IconButton
          aria-label="Search invoices"
          onClick={() => setOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" }, mr: 0.5, color: "var(--slate-600)" }}
        >
          <SearchRoundedIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          gap: 1,
          width: 300,
          mr: 1.5,
          px: 1.25,
          py: 0.75,
          border: "1px solid var(--slate-200)",
          borderRadius: "8px",
          bgcolor: "var(--slate-50)",
          color: "var(--slate-500)",
          font: "inherit",
          fontSize: "var(--fs-sm)",
          cursor: "text",
          "&:hover": { borderColor: "var(--slate-300)" },
          "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: 2 },
        }}
      >
        <SearchRoundedIcon sx={{ fontSize: 18, color: "var(--slate-400)" }} />
        <Box component="span" sx={{ flex: 1, textAlign: "left" }}>Search invoices</Box>
        <Box component="kbd" sx={{ px: 0.5, border: "1px solid var(--slate-200)", borderRadius: "4px", bgcolor: "var(--white)", fontFamily: "inherit", fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
          {SHORTCUT}
        </Box>
      </Box>

      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
        slotProps={{ paper: { sx: { mt: { xs: 2, sm: 10 }, mx: 2, width: "calc(100% - 32px)", borderRadius: "12px" } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, borderBottom: "1px solid var(--slate-100)" }}>
          <SearchRoundedIcon sx={{ color: "var(--slate-400)" }} />
          <InputBase
            autoFocus
            fullWidth
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Invoice number, customer, phone or job"
            inputProps={{ "aria-label": "Search invoices", role: "combobox", "aria-expanded": results.length > 0, "aria-controls": "invoice-search-results" }}
            sx={{ fontSize: "var(--fs-md)" }}
          />
        </Box>

        <Box id="invoice-search-results" role="listbox" ref={listRef} sx={{ maxHeight: 420, overflowY: "auto" }}>
          {!search && results.length > 0 && (
            <Typography sx={{ px: 2, pt: 1.25, pb: 0.5, fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>
              Unpaid invoices
            </Typography>
          )}
          {results.map((invoice, index) => (
              <Box
                key={invoice.id}
                data-index={index}
                role="option"
                aria-selected={index === active}
                onClick={() => openInvoice(invoice.id)}
                onMouseMove={() => setActive(index)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  cursor: "pointer",
                  bgcolor: index === active ? "var(--blue-50)" : "transparent",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)" }}>
                    {invoice.customer_name ?? "No customer"}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
                    {[invoice.invoice_number, invoice.project_type].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)" }}>{formatRupees(invoice.amount)}</Typography>
                  <InvoiceStatusChip invoice={invoice} />
                </Box>
              </Box>
          ))}
          {results.length === 0 && (
            <Typography sx={{ px: 2, py: 4, textAlign: "center", fontSize: "var(--fs-sm)", color: "var(--slate-500)" }}>
              {query.isError
                ? "Couldn't search right now. Please try again."
                : query.isPending || query.isFetching
                  ? "Searching…"
                  : search
                    ? `No invoices match "${search}".`
                    : "No unpaid invoices."}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 2, py: 1, borderTop: "1px solid var(--slate-100)", bgcolor: "var(--slate-50)" }}>
          <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: "var(--fs-xs)", color: "var(--slate-500)" }}>
            ↑↓ to move · Enter to open · Esc to close
          </Typography>
          <Box
            component="button"
            type="button"
            onClick={seeAll}
            sx={{ ml: "auto", p: 0, border: "none", background: "none", cursor: "pointer", font: "inherit", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--blue-700)", "&:hover": { textDecoration: "underline" } }}
          >
            {total > RESULT_LIMIT ? `See all ${total} invoices` : "Go to Invoices"}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
