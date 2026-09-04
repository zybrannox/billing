import { z } from "zod";

// Mirrors the backend's ListOptionCreate (app/list_options/model.py) -
// `category` isn't user-entered here (the caller supplies it per section,
// see admin/pages/SystemSetup.tsx), so only `value` (and, for pricing
// categories, `rate`) need client validation.
export const addListOptionSchema = z.object({
  value: z.string().min(1, "Value is required").max(255),
});

// Used instead of the plain schema when the category prices itself (e.g.
// "item_type" - see PRICED_CATEGORIES on the backend).
export const addPricedListOptionSchema = z.object({
  value: z.string().min(1, "Value is required").max(255),
  rate: z.coerce.number().min(0, "Rate can't be negative"),
});

export type AddListOptionFormData = z.infer<typeof addListOptionSchema>;
