import type { FieldDefinition } from "../../ui/CustomForm";

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
