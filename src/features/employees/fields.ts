import type { FieldDefinition } from "../../ui/CustomForm";

export const addEmployeeFields: FieldDefinition[] = [
  {
    name: "username",
    label: "Name",
    type: "text",
    required: true,
    placeholder: "Enter Name",
    row: 1,
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "Enter email",
    row: 1,
  },
  {
    name: "phone",
    label: "Phone",
    type: "text",
    required: true,
    placeholder: "Enter phone number",
    row: 1,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    required: true,
    placeholder: "Enter Password",
    row: 1,
  },
  {
    name: "role",
    label: "Role",
    type: "select",
    required: true,
    options: [
      { label: "Admin", value: "admin" },
      { label: "Moderator", value: "moderator" },
      { label: "User", value: "user" },
    ],
    defaultValue: "user",
    row: 1,
  },
  {
    name: "is_active",
    label: "Active Employee",
    type: "checkbox",
    defaultValue: true,
    row: 1,
  },
];
