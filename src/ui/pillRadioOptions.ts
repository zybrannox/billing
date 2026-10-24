// Shared option sets for PillRadioGroup.tsx, split into their own file
// (react-refresh's only-export-components rule wants the component file
// to export only the component).
export const PRIORITY_OPTIONS: { value: "Normal" | "High" | "Urgent"; color: string }[] = [
  { value: "Normal", color: "var(--blue-600)" },
  { value: "High", color: "var(--amber-500)" },
  { value: "Urgent", color: "var(--red-600)" },
];

export const CLIENT_STATUS_OPTIONS: { value: "Confirmed" | "Correction"; color: string }[] = [
  { value: "Confirmed", color: "var(--green-600)" },
  { value: "Correction", color: "var(--orange-600)" },
];
