import { z } from "zod";

// The customers table's own rule, after dropping what people naturally type
// between the digits (see NewCustomer in app/projects/model.py).
export const cleanPhone = (value: string) => value.replace(/[\s()-]/g, "");
export const isValidPhone = (value: string) => /^\+?\d{10,15}$/.test(cleanPhone(value)) && cleanPhone(value).length <= 15;

// Mirrors the Add Project form (fields.ts's addProjectFields) and
// the backend's accepted values (app/projects/model.py's ProjectBase) - kept as an explicit schema rather than the auto-derived one
// CustomForm builds per-field, because a few of these rules only make
// sense across fields (delivery not preceding start, which customer fields
// apply) or as a closed set (project_type/client_status), which a per-field
// schema can't express.
export const addProjectSchema = z
  .object({
    // Not a closed enum - Project Type is admin-managed (see
    // features/system/SystemSetup.tsx's list_options table) and AddProject.tsx
    // pulls live options from it, so any active value there (e.g. a
    // "Name Board" type with no equivalent in a hardcoded set) must
    // validate. The backend already treats this as a plain string
    // (app/projects/model.py's ProjectBase.project_type).
    project_type: z.string().min(1, "Select a project type"),
    customer_mode: z.enum(["existing", "new"]),
    customer_id: z.union([z.string(), z.number()]).optional(),
    new_customer_name: z.string().max(100, "Keep the name under 100 characters").optional(),
    new_customer_phone: z.string().optional(),
    assigned_to: z.string().min(1, "Assignee is required"),
    start_date: z.string().datetime({ message: "Invalid start date" }),
    delivery_date: z.string().datetime({ message: "Invalid delivery date" }),
    client_status: z.enum(["Confirmed", "Correction"]),
    // GmailFileUploader tracks each pick as an upload-in-progress object
    // ({status, path, ...}), not a raw File - optional since attachments
    // aren't required to create a project.
    images: z.array(z.any()).optional(),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.delivery_date) < new Date(data.start_date)) {
      ctx.addIssue({ code: "custom", message: "Delivery date cannot be before the start date", path: ["delivery_date"] });
    }
    if (data.customer_mode === "new") {
      if (!data.new_customer_name?.trim()) {
        ctx.addIssue({ code: "custom", message: "Enter the customer's name", path: ["new_customer_name"] });
      }
      if (!isValidPhone(data.new_customer_phone ?? "")) {
        ctx.addIssue({ code: "custom", message: "Enter a valid phone number", path: ["new_customer_phone"] });
      }
    } else if (!data.customer_id) {
      ctx.addIssue({ code: "custom", message: "Customer is required", path: ["customer_id"] });
    }
  });

export type AddProjectFormData = z.infer<typeof addProjectSchema>;
