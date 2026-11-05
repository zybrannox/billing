import { useState } from "react";
import { Alert, Box, Button as MuiButton, IconButton, InputAdornment, Tooltip, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useListOptionsStore, type ListOption } from "../../store/useListOptionsStore";
import Button from "../../ui/Button";
import { GenericDialog } from "../../ui/Dialog";
import TextField from "../../ui/TextField";
import { getApiErrorMessage } from "../../utils/apiError";
import { tierError } from "./itemPricing";

interface TierDraft {
  key: number;
  upTo: string;
  amount: string;
}

const numberSx = {
  "& input[type=number]": { MozAppearance: "textfield" },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
};

// An item's default rate and its minimum charges by size. Remounted for each
// item (see the `key` where it's used), so it always starts from what's saved.
export default function ItemPricingDialog({ option, onClose }: { option: ListOption; onClose: () => void }) {
  const updatePricing = useListOptionsStore((s) => s.updatePricing);
  const [nextKey, setNextKey] = useState((option.min_charges?.length ?? 0) + 1);
  const [rate, setRate] = useState(option.rate != null ? String(option.rate) : "");
  const [tiers, setTiers] = useState<TierDraft[]>(
    (option.min_charges ?? []).map((t, i) => ({ key: i, upTo: String(t.up_to_sq_ft), amount: String(t.amount) })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = (key: number, patch: Partial<TierDraft>) =>
    setTiers((current) => current.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const save = async () => {
    const problem = tierError(tiers);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePricing(option.id, option.category, {
        rate: rate.trim() === "" ? null : Number(rate),
        min_charges: tiers.map((t) => ({ up_to_sq_ft: Number(t.upTo), amount: Number(t.amount) })),
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save the prices. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <GenericDialog open onClose={onClose} title={`${option.value} pricing`} maxWidth="xs" fullWidth>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error" sx={{ borderRadius: "10px" }}>{error}</Alert>}

        <TextField
          label="Rate per sq ft"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          fullWidth
          sx={numberSx}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
        />

        <Box>
          <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--slate-900)" }}>Minimum charges</Typography>
          <Typography sx={{ mb: 1, fontSize: "var(--fs-xs)", color: "var(--slate-500)", lineHeight: 1.35 }}>
            The least a line costs at each size, counting all its pieces. Bigger jobs are charged by the rate. You can still change the total on any bill.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {tiers.map((tier) => (
              <Box key={tier.key} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 32px", gap: 1, alignItems: "center" }}>
                <TextField
                  type="number"
                  value={tier.upTo}
                  onChange={(e) => change(tier.key, { upTo: e.target.value })}
                  sx={numberSx}
                  slotProps={{
                    htmlInput: { "aria-label": "Up to this many sq ft", min: 0 },
                    input: {
                      startAdornment: <InputAdornment position="start">Up to</InputAdornment>,
                      endAdornment: <InputAdornment position="end">sq ft</InputAdornment>,
                    },
                  }}
                />
                <TextField
                  type="number"
                  value={tier.amount}
                  onChange={(e) => change(tier.key, { amount: e.target.value })}
                  sx={numberSx}
                  slotProps={{
                    htmlInput: { "aria-label": "Minimum charge", min: 0 },
                    input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                  }}
                />
                <Tooltip title="Remove">
                  <IconButton
                    size="small"
                    aria-label="Remove this minimum"
                    onClick={() => setTiers((current) => current.filter((t) => t.key !== tier.key))}
                    sx={{ color: "var(--slate-400)", "&:hover": { color: "var(--red-600)", bgcolor: "var(--red-50)" } }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>

          <MuiButton
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setTiers((current) => [...current, { key: nextKey, upTo: "", amount: "" }]);
              setNextKey((k) => k + 1);
            }}
            sx={{ mt: 1, textTransform: "none", fontWeight: 600 }}
          >
            Add minimum
          </MuiButton>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1, borderTop: "1px solid var(--slate-100)" }}>
          <MuiButton onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: "var(--slate-600)" }}>Cancel</MuiButton>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </Box>
      </Box>
    </GenericDialog>
  );
}
