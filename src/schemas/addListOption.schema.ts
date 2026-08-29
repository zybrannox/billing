import { z } from "zod";

// Mirrors the backend's ListOptionCreate (app/list_options/model.py) -
// `category` isn't user-entered here (the caller supplies it per section,
// see admin/pages/SystemSetup.tsx), so only `value` needs client validation.
export const addListOptionSchema = z.object({
  value: z.string().min(1, "Value is required").max(255),
});

export type AddListOptionFormData = z.infer<typeof addListOptionSchema>;
