import { Box, Typography } from "@mui/material";
import { formatRupees } from "../../../format/money";
import { surfaceSx } from "../../../ui/surface";
import { useInvoiceSummary } from "../queries";

// What's owed at a glance. Each figure that maps onto a view opens that view.
export default function PaymentSummary({ onView }: { onView: (view: string) => void }) {
  const { data } = useInvoiceSummary();
  const cells: { label: string; value?: number; view?: string; alert?: boolean }[] = [
    { label: "Total outstanding", value: data?.total_outstanding, view: "unpaid" },
    { label: "Overdue", value: data?.overdue, view: "overdue", alert: (data?.overdue ?? 0) > 0 },
    { label: "Due today", value: data?.due_today },
    { label: "Due within 30 days", value: data?.due_within_30_days },
  ];
  return (
    <Box
      component="section"
      aria-label="Payment summary"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
        mb: 2,
        ...surfaceSx,
        overflow: "hidden",
      }}
    >
      {cells.map((cell) => (
        <Box
          key={cell.label}
          component={cell.view ? "button" : "div"}
          {...(cell.view ? { type: "button" as const, onClick: () => onView(cell.view as string) } : {})}
          sx={{
            px: 2,
            py: 1.5,
            border: "none",
            background: "none",
            font: "inherit",
            textAlign: "left",
            minWidth: 0,
            cursor: cell.view ? "pointer" : "default",
            ...(cell.view ? { "&:hover": { bgcolor: "var(--slate-50)" } } : {}),
            "&:focus-visible": { outline: "2px solid var(--blue-500)", outlineOffset: -2 },
          }}
        >
          <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--slate-500)" }}>{cell.label}</Typography>
          <Typography sx={{ mt: 0.25, fontSize: "var(--fs-4xl)", fontWeight: 700, lineHeight: 1.25, color: cell.alert ? "var(--red-600)" : "var(--slate-900)" }}>
            {cell.value === undefined ? "—" : formatRupees(cell.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
