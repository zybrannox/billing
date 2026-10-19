import { z } from "zod";
import { MIN_PASSWORD_LENGTH, passwordTooShortMessage } from "../config/passwordPolicy";

// Mirrors the Add Employee form (config/admin.ts's addEmployeeFields) and
// the backend's accepted values (app/users/model.py's UserCreate,
// app/entities/user.py's UserRole). The password rule is the shared one in
// config/passwordPolicy.ts (the backend's app/password_policy.py).
export const addEmployeeSchema = z.object({
  username: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.email({ message: "Invalid email address" }),
  phone: z.string().min(7, "Enter a valid phone number"),
  password: z.string().min(MIN_PASSWORD_LENGTH, passwordTooShortMessage),
  role: z.enum(["admin", "moderator", "user"]),
  is_active: z.boolean().default(true),
});

export type AddEmployeeFormData = z.infer<typeof addEmployeeSchema>;
