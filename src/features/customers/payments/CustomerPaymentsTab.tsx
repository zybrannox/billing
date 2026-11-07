import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, IconButton, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import { apiService } from "../../../api/service";
import type { CustomerPayment, CustomerPaymentList } from "../../../api/types";
import { formatDate } from "../../../format/date";
import { formatRupees as money } from "../../../format/money";
import { useConfirmDialogStore } from "../../../hooks/useconfirmDialogStore";
import CrudActions from "../../../ui/Actions";
import EmptyState from "../../../ui/EmptyState";
import ListState from "../../../ui/ListState";
import Table from "../../../ui/Table";
import { useInvalidateBilling } from "../../billing/queries";
import { paymentKeys } from "./paymentKeys";

// Every payment this customer made, what it paid off, and what's left as credit.
export default function CustomerPaymentsTab({
  customerId,
  onUseCredit,
  onChanged,
}: {
  customerId: number;
  onUseCredit: (payment: CustomerPayment) => void;
  onChanged: () => void;
}) {
  const client = useQueryClient();
  const invalidateBilling = useInvalidateBilling();
  const { showDialog } = useConfirmDialogStore();
  const query = useQuery({
    queryKey: paymentKeys.list(customerId),
    queryFn: () => apiService.get<CustomerPaymentList>(`/customers/${customerId}/payments`),
  });
  const payments = query.data?.items ?? [];

  const columns = useMemo<GridColDef<CustomerPayment>[]>(
    () => [
      { field: "received_at", headerName: "Date", width: 120, renderCell: ({ value }) => formatDate(value) },
      {
        field: "amount",
        headerName: "Amount",
        width: 120,
        align: "right",
        headerAlign: "right",
        renderCell: ({ value }) => <span style={{ fontWeight: 600 }}>{money(value)}</span>,
      },
      {
        field: "payment_method",
        headerName: "Method",
        width: 180,
        renderCell: ({ row }) => (
          <Tooltip title={row.note ?? ""}>
            <span>
              {row.payment_method}
              {row.payment_reference && <span style={{ color: "var(--slate-500)" }}> · {row.payment_reference}</span>}
            </span>
          </Tooltip>
        ),
      },
      {
        field: "applied_to",
        headerName: "Paid off",
        flex: 1,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) =>
          row.applied_to.length === 0 ? (
            <span style={{ color: "var(--slate-400)" }}>Not on any invoice yet</span>
          ) : (
            <Box sx={{ display: "flex", gap: 0.5, overflow: "hidden" }}>
              {row.applied_to.map((a) => (
                <Box
                  key={a.invoice_id}
                  component="span"
                  sx={{ px: 0.75, py: 0.25, borderRadius: "6px", bgcolor: "var(--slate-100)", fontSize: "var(--fs-xs)", whiteSpace: "nowrap" }}
                >
                  {a.invoice_number ?? `#${a.invoice_id}`} · {money(a.amount)}
                </Box>
              ))}
            </Box>
          ),
      },
      {
        field: "unused",
        headerName: "Credit left",
        width: 120,
        align: "right",
        headerAlign: "right",
        renderCell: ({ value }) =>
          value > 0 ? <span style={{ fontWeight: 700, color: "var(--emerald-700)" }}>{money(value)}</span> : <span style={{ color: "var(--slate-400)" }}>—</span>,
      },
    ],
    [],
  );

  const remove = (payment: CustomerPayment) =>
    showDialog({
      title: "Delete this payment?",
      description:
        payment.applied_to.length > 0
          ? `${money(payment.applied_to.reduce((sum, a) => sum + a.amount, 0))} will be taken back off ${payment.applied_to.map((a) => a.invoice_number).join(", ")}, so those invoices will be owed again${payment.unused > 0 ? `, and its ${money(payment.unused)} credit removed` : ""}. You can restore it from the Bin for 14 days, as unused credit.`
          : `${money(payment.amount)} of unused credit will be removed. You can restore it from the Bin for 14 days.`,
      confirmText: "Delete payment",
      cancelText: "Keep it",
      isDestructive: true,
      onConfirm: async () => {
        await apiService.delete(`/customer-payments/${payment.id}`);
        await Promise.all([
          client.invalidateQueries({ queryKey: paymentKeys.list(customerId) }),
          client.invalidateQueries({ queryKey: paymentKeys.open(customerId) }),
          invalidateBilling(),
        ]);
        onChanged();
      },
    });

  if (query.isPending || query.isError) {
    return <ListState loading={query.isPending} error={query.isError} empty={false} errorText="Couldn't load payments." emptyText="" />;
  }
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<PaymentsRoundedIcon />}
        title="No payments yet"
        description="Use Receive payment to record money they paid and split it across their invoices."
      />
    );
  }

  return (
    <Table<CustomerPayment>
      bare
      rows={payments}
      columns={columns}
      actionsWidth={100}
      renderActions={({ row }) => [
        ...(row.unused > 0
          ? [
              <Tooltip key="use" title="Use this credit on an invoice">
                <IconButton size="small" aria-label="Use credit" onClick={() => onUseCredit(row)} sx={{ color: "var(--emerald-700)" }}>
                  <SavingsRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>,
            ]
          : []),
        <CrudActions key="delete" delete onDelete={() => remove(row)} size="small" />,
      ]}
    />
  );
}
