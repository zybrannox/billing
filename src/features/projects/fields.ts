import type { FieldDefinition } from "../../ui/CustomForm";
import { messages } from "../../messages";

export const addProjectFields: FieldDefinition[] = [
  {
    name: "project_type",
    label: messages.fields.projectType,
    type: "select",
    required: true,
    defaultValue: "Flex",
    options: ["Flex", "Photo Frame", "Gift"],
    row: 1,
  },
  {
    name: "customer_mode",
    label: "Customer",
    type: "radio",
    required: true,
    defaultValue: "existing",
    options: [
      { label: "Existing", value: "existing" },
      { label: "New customer", value: "new" },
    ],
    row: 1,
  },
  {
    name: "customer_id",
    label: "Customer Name",
    type: "async_select",
    placeholder: messages.placeholders.searchCustomers,
    required: true,
    row: 1,
    asyncEndpoint: "/customers",
    // "most_used" surfaces customers with the most existing projects first,
    // so users can click a frequent customer instead of hunting through an
    // alphabetical list. Opt-in on this field only - the backend defaults to
    // alphabetical ("name") for every other /customers caller.
    asyncExtraParams: { limit: 20, sort: "most_used", exclude_placeholders: "true" },
    getOptionLabel: (c: { first_name: string; last_name: string }) => `${c.first_name} ${c.last_name}`,
    getOptionValue: (c: { id: number }) => c.id,
  },
  {
    name: "new_customer_name",
    label: "Customer Name",
    type: "text",
    placeholder: "Enter customer name",
    required: true,
    row: 1,
  },
  {
    name: "new_customer_phone",
    label: "Phone Number",
    type: "text",
    placeholder: "Enter phone number",
    required: true,
    row: 1,
  },
  {
    name: "assigned_to",
    label: "Assigned To",
    type: "async_select",
    placeholder: "Search employees...",
    required: true,
    row: 1,
    asyncEndpoint: "/users",
    // Admins are excluded - this is for picking who a project is assigned to.
    asyncExtraParams: { role: "user", limit: 20 },
    getOptionLabel: (u: { username: string }) => u.username,
    getOptionValue: (u: { username: string }) => u.username,
  },
  {
    name: "start_date",
    label: messages.fields.startDate,
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
    name: "client_status",
    label: messages.fields.clientStatus,
    type: "radio",
    required: true,
    defaultValue: "Confirmed",
    options: [
      {
        label: "Confirmed",
        value: "Confirmed",
        color: "var(--green-600)", // Green – approved / accepted
      },
      {
        label: "Correction",
        value: "Correction",
        color: "var(--orange-600)", // Orange – needs changes (not an error)
      },
    ],
    row: 1,
  },
    {
    name: "images",
    label: "Images",
    type: "file_upload",
    multiple: true,
    placeholder: "Upload project images",
    required: false,
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

];
