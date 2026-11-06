import { Box, FormControlLabel, Radio, RadioGroup, TextField } from "@mui/material";
import { messages } from "../../../messages";
import AsyncSearchSelect from "../../../ui/AsyncSearchSelect";
import type { CustomerChoiceValue } from "./customerChoiceRules";

interface CustomerOption {
  id: number;
  first_name: string;
  last_name: string;
}

const radioSx = { "& .MuiFormControlLabel-label": { fontSize: "var(--fs-sm)" } };

// Picking a saved customer for a new invoice or quotation, or typing in a new one.
export default function CustomerChoice({
  value,
  onChange,
}: {
  value: CustomerChoiceValue;
  onChange: (value: CustomerChoiceValue) => void;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <RadioGroup
        row
        aria-label="Customer"
        value={value.mode}
        onChange={(e) => onChange({ ...value, mode: e.target.value as CustomerChoiceValue["mode"] })}
      >
        <FormControlLabel value="existing" control={<Radio size="small" />} label="Existing" sx={radioSx} />
        <FormControlLabel value="new" control={<Radio size="small" />} label="New customer" sx={radioSx} />
      </RadioGroup>
      {value.mode === "existing" ? (
        <AsyncSearchSelect
          placeholder={messages.placeholders.searchCustomers}
          endpoint="/customers"
          extraParams={{ limit: 20, sort: "most_used", exclude_placeholders: "true" }}
          getOptionLabel={(c: CustomerOption) => `${c.first_name} ${c.last_name}`}
          getOptionValue={(c: CustomerOption) => c.id}
          value={value.customerId}
          onChange={(v) => onChange({ ...value, customerId: v as number | undefined })}
        />
      ) : (
        <Box sx={{ display: "grid", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Customer name"
            aria-label="Customer name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
          <TextField
            size="small"
            placeholder="Phone number"
            aria-label="Phone number"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
          />
        </Box>
      )}
    </Box>
  );
}
