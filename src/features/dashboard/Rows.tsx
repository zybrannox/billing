import { Box, Typography } from "@mui/material";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { formatDate } from "../../format/date";
import { getDeliveryBadge, type RecentDelivery } from "../../domain/deliveryStatus";
import { formatRupeesWhole as money } from "../../format/money";
import { CUSTOMER_INITIALS, DUE_TONE_STYLES, PROJECT_TYPE_INITIAL, STATUS_STYLES, getDueLabel } from "./helpers";
import { type AttentionProject, type RecentInvoice, type TopCustomer } from "./types";

// ---------------------------------------------------------------------
// Attention Queue row - a compact "ticket" row (project-type avatar,
// customer + status, and a computed urgency pill) that reads at a glance
// and makes the whole row an obvious click target.
// ---------------------------------------------------------------------
export function AttentionRow({ project, onClick }: { project: AttentionProject; onClick: () => void }) {
  const due = getDueLabel(project.delivery_date, project.is_overdue, project.is_credit_unpaid);
  const tone = DUE_TONE_STYLES[due.tone];

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "10px",
        border: "1px solid var(--slate-100)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": {
          borderColor: "var(--slate-200)",
          bgcolor: "var(--slate-50)",
          "& .attn-arrow": { opacity: 1, transform: "translateX(2px)" },
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          bgcolor: tone.bg,
          color: tone.color,
          border: "1px solid",
          borderColor: tone.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "var(--fs-lg)",
          flexShrink: 0,
        }}
      >
        {PROJECT_TYPE_INITIAL(project.project_type)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
          {project.customer_name || "Unnamed Client"}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-400)" }} noWrap>
          {project.project_type} · {project.print_status}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        <Box
          sx={{
            px: 1.1,
            py: 0.4,
            borderRadius: 999,
            bgcolor: tone.bg,
            color: tone.color,
            border: "1px solid",
            borderColor: tone.border,
            fontSize: "var(--fs-2xs)",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {due.text}
        </Box>
        <ChevronRightRoundedIcon
          className="attn-arrow"
          sx={{ fontSize: 18, color: "var(--slate-300)", opacity: 0, transition: "all 0.15s ease" }}
        />
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Recent Deliveries row - the closest thing this app has to a delivery
// notification feed: every project that's been marked Delivered, most
// recent first, each carrying its current payment state so a credit
// delivery reads as "delivered, still unpaid" instead of looking
// identical to a normal paid-then-delivered order (see getDeliveryBadge).
// ---------------------------------------------------------------------
export function DeliveryRow({ delivery, onClick }: { delivery: RecentDelivery; onClick: () => void }) {
  const badge = getDeliveryBadge(delivery);
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "10px",
        border: "1px solid var(--slate-100)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": { borderColor: "var(--slate-200)", bgcolor: "var(--slate-50)" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          bgcolor: "var(--blue-50)",
          color: "var(--blue-600)",
          border: "1px solid var(--blue-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <LocalShippingRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
          {delivery.customer_name || "Unnamed Client"}
        </Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-400)" }} noWrap>
          {delivery.project_type} · Delivered {formatDate(delivery.delivered_at)}
          {delivery.delivered_by ? ` by ${delivery.delivered_by}` : ""}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1.1,
          py: 0.4,
          borderRadius: 999,
          bgcolor: badge.bg,
          color: badge.color,
          fontSize: "var(--fs-2xs)",
          fontWeight: 800,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {badge.label}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Customer Leaderboard row - rank medal + avatar + a relative-spend bar
// filled behind the row, so the gap between customers reads visually,
// not just as two numbers you have to compare yourself.
// ---------------------------------------------------------------------
export function CustomerLeaderboardRow({ rank, customer, maxSpent }: { rank: number; customer: TopCustomer; maxSpent: number }) {
  const pct = maxSpent > 0 ? Math.max(10, Math.round((customer.total_spent / maxSpent) * 100)) : 0;
  const medal =
    rank === 1
      ? { bg: "var(--amber-100)", color: "var(--amber-800)", border: "var(--amber-200)", fill: "var(--amber-50)" }
      : rank === 2
      ? { bg: "var(--slate-100)", color: "var(--slate-600)", border: "var(--slate-200)", fill: "var(--slate-50)" }
      : rank === 3
      ? { bg: "var(--orange-100)", color: "var(--orange-800)", border: "var(--orange-300)", fill: "var(--orange-50)" }
      : { bg: "var(--slate-100)", color: "var(--slate-400)", border: "var(--slate-200)", fill: "var(--slate-50)" };

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid var(--slate-100)",
        transition: "border-color 0.15s ease",
        "&:hover": { borderColor: "var(--slate-200)" },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          bgcolor: medal.fill,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1.25 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--fs-2xs)",
            fontWeight: 800,
            bgcolor: medal.bg,
            color: medal.color,
            border: "1px solid",
            borderColor: medal.border,
            flexShrink: 0,
          }}
        >
          {rank}
        </Box>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: "var(--slate-900)",
            color: "var(--white)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--fs-2xs)",
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {CUSTOMER_INITIALS(customer.customer_name)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
            {customer.customer_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {customer.order_count} {customer.order_count === 1 ? "order" : "orders"}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 800, color: "var(--slate-900)", fontSize: "var(--fs-lg)", flexShrink: 0 }}>
          {money(customer.total_spent)}
        </Typography>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Recent invoice row - the same compact "avatar, two lines, value on the
// right" shape as the attention and delivery rows, so a half-width card
// doesn't need a wide five-column table.
// ---------------------------------------------------------------------
export function InvoiceRow({ invoice, onClick }: { invoice: RecentInvoice; onClick: () => void }) {
  const style = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.pending;
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.25,
        borderRadius: "10px",
        border: "1px solid var(--slate-100)",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        "&:hover": { bgcolor: "var(--slate-50)" },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "8px",
          bgcolor: "var(--indigo-50)",
          color: "var(--indigo-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "var(--fs-md)",
          flexShrink: 0,
        }}
      >
        {PROJECT_TYPE_INITIAL(invoice.project_type)}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)" }} noWrap>
          {invoice.customer_name || "Guest Customer"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
          #{invoice.invoice_number} · {invoice.project_type || "Custom Project"} · {formatDate(invoice.created_at)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "var(--fs-md)" }}>
          {money(invoice.amount)}
        </Typography>
        <Box
          sx={{
            display: "inline-block",
            px: 1,
            py: 0.2,
            borderRadius: "6px",
            bgcolor: style.bg,
            color: style.color,
            fontSize: "var(--fs-2xs)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {style.label}
        </Box>
      </Box>
    </Box>
  );
}
