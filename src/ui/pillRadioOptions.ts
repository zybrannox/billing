// Shared option sets for PillRadioGroup.tsx, split into their own file
// (react-refresh's only-export-components rule wants the component file
// to export only the component).
export const CLIENT_STATUS_OPTIONS: { value: "Confirmed" | "Correction"; color: string }[] = [
  { value: "Confirmed", color: "var(--green-600)" },
  { value: "Correction", color: "var(--orange-600)" },
];
