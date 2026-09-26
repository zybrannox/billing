import { z } from "zod";

// A numberField helper, not plain z.number() - a native <input type="number">
// driven by CustomForm's plain Controller (see ui/TextField.tsx, no
// valueAsNumber) submits a *string*, not a JS number. CustomForm's own
// auto-generated schema handles this via the same z.preprocess trick for
// any field left to build its schema automatically; this form passes an
// explicit zodSchema instead, so it needs the same coercion spelled out
// here or every submission with these fields filled in would fail
// validation with "Expected number, received string".
const numberField = (min = 0) =>
  z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(min).optional(),
  );

// Mirrors the Add Company form (config/common.ts's addCompanyFields) and
// the backend's accepted values (app/companies/model.py's CompanyBase).
export const addCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  billing_email: z
    .email({ message: "Invalid email address" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  payment_terms_days: numberField(0),
  credit_limit: numberField(0),
  billing_address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type AddCompanyFormData = z.infer<typeof addCompanySchema>;
