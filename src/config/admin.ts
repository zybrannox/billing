import { Assignment, Badge, ReceiptLong, People, Settings, Dashboard } from "@mui/icons-material";
import type { FieldDefinition } from "../common/components/CustomForm";
import type { NavItem } from "../types/adminTypes";

export const loginFormFields = [
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "example@user.com",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "password",
    required: true,
  },
] as const satisfies FieldDefinition[];

export const addTeamMembers = [
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "phone",
    label: "Phone",
    type: "text",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "designation",
    label: "Designation",
    type: "text",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "gender",
    label: "Gender",
    type: "text",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "dob",
    label: "Date of Birth",
    type: "date",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "profileImage",
    label: "Profile Image",
    type: "file",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "joiningDate",
    label: "Joining Date",
    type: "date",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "status",
    label: "Status",
    type: "text",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
  {
    name: "address",
    label: "Address",
    type: "textarea",
    placeholder: "example@user.com",
    required: true,
    row: 1,
  },
] as const satisfies FieldDefinition[];

export const projectType = [
  {
    value: "Flex",
  },
  {
    value: "Photo Frame",
  },
  {
    value: "Gift",
  },
  {
    value: "Custom Type",
  },
];

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

export const changePasswordFields: FieldDefinition[] = [
  {
    name: "new_password",
    label: "New Password",
    type: "password",
    required: true,
    min: 6,
    placeholder: "Enter new password",
  },
];

export const adminNavigations: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Dashboard },
  { name: "Projects", href: "/admin/projects", icon: Assignment },
  { name: "Customers", href: "/admin/customers", icon: People },
  { name: "Employees", href: "/admin/employees", icon: Badge },
  { name: "Billing", href: "/admin/billing", icon: ReceiptLong },
  { name: "System Setup", href: "/admin/system-setup", icon: Settings },
];
