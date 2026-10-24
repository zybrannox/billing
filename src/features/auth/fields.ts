import type { FieldDefinition } from "../../ui/CustomForm";
import { MIN_PASSWORD_LENGTH } from "./passwordPolicy";

export const changePasswordFields: FieldDefinition[] = [
  {
    name: "new_password",
    label: "New Password",
    type: "password",
    required: true,
    min: MIN_PASSWORD_LENGTH,
    placeholder: "Enter new password",
  },
];
