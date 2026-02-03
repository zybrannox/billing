import type { FieldDefinition } from "../common/componets/CustomForm";

export const addProjectFields: FieldDefinition[] = [
  {
    name: "project_type",
    label: "Project Type",
    type: "select",
    required: true,
    defaultValue: "Flex",
    options: ["Flex", "Photo Frame", "Gift"],
    row: 1,
  },
  {
    name: "assigned_to",
    label: "Assigned To",
    type: "text",
    placeholder: "Enter assignee name",
    required: true,
    row: 1,
  },
  {
    name: "start_date",
    label: "Start Date",
    type: "date_time",
    defaultValue: new Date().toISOString(),
    required: true,
    row: 1,
  },
  {
    name: "delivery_date",
    label: "Delivery Date",
    type: "date_time",
    defaultValue: new Date().toISOString(),
    required: true,
    row: 1,
  },
  {
    name: "priority",
    label: "Priority",
    type: "radio",
    required: true,
    defaultValue: "Normal",
    options: [
      {
        label: "Low",
        value: "Low",
        color: "#6B7280", // Muted Gray (low emphasis)
      },
      {
        label: "Normal",
        value: "Normal",
        color: "#2563EB", // Calm Blue (default / stable)
      },
      {
        label: "High",
        value: "High",
        color: "#F59E0B", // Amber (attention)
      },
      {
        label: "Urgent",
        value: "Urgent",
        color: "#DC2626", // Strong Red (critical)
      },
    ],
    row: 1,
  },
  {
    name: "client_status",
    label: "Client Status",
    type: "radio",
    required: true,
    defaultValue: "Confirmed",
    options: [
      {
        label: "Confirmed",
        value: "Confirmed",
        color: "#16A34A", // Green – approved / accepted
      },
      {
        label: "Correction",
        value: "Correction",
        color: "#EA580C", // Orange – needs changes (not an error)
      },
    ],
    row: 1,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Enter project description",
    required: false,
    row: 1,
  },
  {
    name: "images",
    label: "Images",
    type: "file",
    multiple: true,
    placeholder: "Upload project images",
    required: false,
    row: 1,
  },
];
