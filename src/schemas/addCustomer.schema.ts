import { z } from "zod";

// Mirrors the Add Customer form (config/common.ts's addCustomerFields) and
// the backend's accepted values (app/customers/model.py's CustomerBase).
export const addCustomerSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  contact_number: z.string().min(7, "Enter a valid contact number"),
  email: z
    .email({ message: "Invalid email address" })
    .optional()
    .or(z.literal("")),
  // async_select's own value shape (see AsyncSearchSelect) - optional,
  // since most customers aren't B2B contacts of any company.
  company_id: z.union([z.string(), z.number()]).optional(),
});

export type AddCustomerFormData = z.infer<typeof addCustomerSchema>;
