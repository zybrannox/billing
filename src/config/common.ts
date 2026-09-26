import type { FieldDefinition } from "../common/components/CustomForm";

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
    name: "customer_id",
    label: "Customer Name",
    type: "async_select",
    placeholder: "Search customers...",
    required: true,
    row: 1,
    asyncEndpoint: "/customers",
    // "most_used" surfaces customers with the most existing projects first,
    // so users can click a frequent customer instead of hunting through an
    // alphabetical list. Opt-in on this field only - the backend defaults to
    // alphabetical ("name") for every other /customers caller.
    asyncExtraParams: { limit: 20, sort: "most_used" },
    getOptionLabel: (c) => `${c.first_name} ${c.last_name}`,
    getOptionValue: (c) => c.id,
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
    getOptionLabel: (u) => u.username,
    getOptionValue: (u) => u.username,
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
        label: "Normal",
        value: "Normal",
        color: "var(--blue-600)", // Calm Blue (default / stable)
      },
      {
        label: "High",
        value: "High",
        color: "var(--amber-500)", // Amber (attention)
      },
      {
        label: "Urgent",
        value: "Urgent",
        color: "var(--red-600)", // Strong Red (critical)
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

export const addCustomerFields: FieldDefinition[] = [
  {
    name: "first_name",
    label: "First Name",
    type: "text",
    required: true,
    placeholder: "Enter first name",
    row: 1,
  },
  {
    name: "last_name",
    label: "Last Name",
    type: "text",
    required: true,
    placeholder: "Enter last name",
    row: 1,
  },
  {
    name: "contact_number",
    label: "Contact Number",
    type: "text",
    required: true,
    placeholder: "Enter contact number",
    row: 2,
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: false,
    placeholder: "Enter email address (optional)",
    row: 2,
  },
  {
    name: "company_id",
    label: "Company",
    type: "async_select",
    placeholder: "Search companies... (optional, for B2B contacts)",
    required: false,
    row: 3,
    asyncEndpoint: "/companies",
    getOptionLabel: (c) => c.name,
    getOptionValue: (c) => c.id,
  },
];

export const addCompanyFields: FieldDefinition[] = [
  {
    name: "name",
    label: "Company Name",
    type: "text",
    required: true,
    placeholder: "Enter company name",
    row: 1,
  },
  {
    name: "billing_email",
    label: "Billing Email",
    type: "email",
    required: false,
    placeholder: "Enter billing email (optional)",
    row: 1,
  },
  {
    name: "phone",
    label: "Phone",
    type: "text",
    required: false,
    placeholder: "Enter phone number (optional)",
    row: 2,
  },
  {
    name: "payment_terms_days",
    label: "Payment Terms (days)",
    type: "number",
    required: false,
    placeholder: "e.g. 30 for NET-30",
    defaultValue: "0",
    row: 2,
  },
  {
    name: "credit_limit",
    label: "Credit Limit (₹)",
    type: "number",
    required: false,
    placeholder: "Optional - leave blank for no limit",
    row: 3,
  },
  {
    name: "billing_address",
    label: "Billing Address",
    type: "textarea",
    required: false,
    placeholder: "Enter billing address (optional)",
    row: 3,
  },
  {
    name: "notes",
    label: "Notes",
    type: "textarea",
    required: false,
    placeholder: "Internal notes (optional)",
    row: 4,
  },
];
