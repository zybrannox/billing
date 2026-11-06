import { Box, Typography } from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import type { InvoicePreview } from "../../../api/types";
import { messages } from "../../../messages";
import { InvoicePanelLabel } from "../../../ui/InvoiceDocument";
import CustomerChoice from "./CustomerChoice";
import type { CustomerChoiceValue } from "./customerChoiceRules";

// Picking who a new job is billed to.
export function BilledToPicker({ value, onChange }: { value: CustomerChoiceValue; onChange: (value: CustomerChoiceValue) => void }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
      <Box sx={{ p: 1, bgcolor: "var(--slate-100)", borderRadius: 1.5, color: "var(--slate-600)", mt: 0.5 }}>
        <PersonRoundedIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <InvoicePanelLabel>{messages.fields.billedTo}</InvoicePanelLabel>
        <Box sx={{ mt: 0.75 }}>
          <CustomerChoice value={value} onChange={onChange} />
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
