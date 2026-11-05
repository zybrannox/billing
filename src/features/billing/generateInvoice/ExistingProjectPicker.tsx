import { useState, type ReactNode } from "react";
import { Box, Button as MuiButton, Typography } from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AsyncSearchSelect from "../../../ui/AsyncSearchSelect";
import Button from "../../../ui/Button";

interface ProjectOption {
  id: number;
  project_type: string;
  customer_name: string | null;
  assigned_to: string;
}

// Choosing an already-tracked project that hasn't been invoiced yet.
export default function ExistingProjectPicker({
  modeToggle,
  onCancel,
  onContinue,
}: {
  modeToggle: ReactNode;
  onCancel: () => void;
  onContinue: (projectId: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | undefined>();

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ p: 1, bgcolor: "var(--blue-50)", borderRadius: 2, color: "var(--blue-600)", display: "flex" }}>
            <ReceiptLongRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "var(--slate-800)" }}>Create an Invoice</Typography>
            <Typography variant="caption" color="text.secondary">
              Search for the project you want to invoice
            </Typography>
          </Box>
        </Box>
        {modeToggle}
      </Box>

      <AsyncSearchSelect
        label="Project"
        placeholder="Search by project type, customer, assignee..."
        endpoint="/projects"
        extraParams={{ page_size: 20 }}
        getOptionLabel={(p: ProjectOption) => `${p.project_type}${p.customer_name ? ` — ${p.customer_name}` : ""} (${p.assigned_to})`}
        getOptionValue={(p: ProjectOption) => p.id}
        value={selectedId}
        onChange={(v) => setSelectedId(v as number | undefined)}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3, pt: 2, borderTop: "1px solid var(--slate-200)" }}>
        <MuiButton onClick={onCancel} sx={{ color: "var(--slate-500)", textTransform: "none", fontWeight: 600, px: 3, "&:hover": { bgcolor: "var(--slate-100)" } }}>
          Cancel
        </MuiButton>
        <Button onClick={() => selectedId && onContinue(selectedId)} disabled={!selectedId} variant="contained">
          Continue
        </Button>
      </Box>
    </Box>
  );
}
