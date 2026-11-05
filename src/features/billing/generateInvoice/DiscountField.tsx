import { Box, InputAdornment, Paper, Typography } from "@mui/material";
import DiscountRoundedIcon from "@mui/icons-material/DiscountRounded";
import { messages } from "../../../messages";
import TextField from "../../../ui/TextField";
import { numberFieldSx } from "./fieldStyles";

export default function DiscountField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: "var(--slate-50)",
          border: "1px solid var(--slate-200)",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--slate-600)" }}>
          <DiscountRoundedIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {messages.fields.discountAmount}
          </Typography>
        </Box>
        <Box sx={{ width: 140 }}>
          <TextField
            type="number"
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            sx={numberFieldSx}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
