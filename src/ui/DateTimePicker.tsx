import dayjs, { Dayjs } from "dayjs";
import {
  LocalizationProvider,
  DateTimePicker as MUIDateTimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

type Props = {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: boolean;
  helperText?: string;
};

export default function DateTimePicker({
  label,
  value,
  onChange,
  error,
  helperText,
}: Props) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MUIDateTimePicker
        label={label}
        value={value ? dayjs(value) : null}
        onChange={(newValue: Dayjs | null) =>
          onChange(newValue ? newValue.toISOString() : null)
        }
        slotProps={{
          textField: {
            fullWidth: true,
            error,
            helperText,
          },
        }}
      />
    </LocalizationProvider>
  );
}
