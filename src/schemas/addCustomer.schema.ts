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
  // since most customers aren't B2B contacts of any company. The field
  // defaults to "" (not null/undefined) when left untouched - CustomForm's
  // Controller gives it defaultValue={field.defaultValue ?? ""} - and the
  // backend's Optional[int] rejects an empty string outright ("Input
  // should be a valid integer") rather than treating it as absent. This
  // preprocess is what actually strips "" down to undefined before it
  // reaches the request body, where JSON.stringify then drops the key
  // entirely instead of sending company_id: "".
  company_id: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.union([z.string(), z.number()]).optional(),
  ),
});

export type AddCustomerFormData = z.infer<typeof addCustomerSchema>;
