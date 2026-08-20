import { z } from "zod";

// Mirrors the Add Employee form (config/admin.ts's addEmployeeFields) and
// the backend's accepted values (app/users/model.py's UserCreate,
// app/entities/user.py's UserRole). The password minimum matches
// UserPasswordUpdate's own Field(min_length=6) on the backend - same rule,
// applied at creation time too instead of only when changing it later.
export const addEmployeeSchema = z.object({
  username: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.email({ message: "Invalid email address" }),
  phone: z.string().min(7, "Enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "moderator", "user"]),
  is_active: z.boolean().default(true),
});

export type AddEmployeeFormData = z.infer<typeof addEmployeeSchema>;
