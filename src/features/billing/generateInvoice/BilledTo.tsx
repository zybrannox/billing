import { Box, Typography } from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import type { InvoicePreview } from "../../../api/types";
import { messages } from "../../../messages";
import AsyncSearchSelect from "../../../ui/AsyncSearchSelect";
import { InvoicePanelLabel } from "../../../ui/InvoiceDocument";

interface CustomerOption {
  id: number;
  first_name: string;
  last_name: string;
}

// Picking who a new job is billed to.
export function BilledToPicker({ value, onChange }: { value?: number; onChange: (id?: number) => void }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
        <PersonRoundedIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1 }}>
        <InvoicePanelLabel>{messages.fields.billedTo}</InvoicePanelLabel>
        <Box sx={{ mt: 0.75 }}>
          <AsyncSearchSelect
            placeholder={messages.placeholders.searchCustomers}
            endpoint="/customers"
            extraParams={{ limit: 20, sort: "most_used" }}
            getOptionLabel={(c: CustomerOption) => `${c.first_name} ${c.last_name}`}
            getOptionValue={(c: CustomerOption) => c.id}
            value={value}
            onChange={(v) => onChange(v as number | undefined)}
          />
        </Box>
      </Box>
    </Box>
  );
}

// Who an existing project is billed to.
export function BilledToSummary({ customer }: { customer?: InvoicePreview["customer"] | null }) {
  const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "Unassigned Customer";
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
        <PersonRoundedIcon fontSize="small" />
      </Box>
      <Box>
        <InvoicePanelLabel>{messages.fields.billedTo}</InvoicePanelLabel>
        <Typography sx={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "var(--fs-xl)" }}>
          {customerName}
        </Typography>
        {customer && (
          <Box sx={{ mt: 0.25 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--fs-md)", lineHeight: 1.4 }}>
              {customer.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "var(--fs-md)", lineHeight: 1.4 }}>
              {customer.contact_number}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
