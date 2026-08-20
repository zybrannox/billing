import { z } from "zod";

// Mirrors the Add Project form (config/common.ts's addProjectFields) and
// the backend's accepted values (app/projects/model.py's ProjectBase,
// Priority) - kept as an explicit schema rather than the auto-derived one
// CustomForm builds per-field, because a few of these rules only make
// sense across fields (delivery not preceding start) or as a closed set
// (project_type/priority/client_status), which a per-field schema can't
// express.
export const addProjectSchema = z
  .object({
    project_type: z.enum(["Flex", "Photo Frame", "Gift"], {
      message: "Select a project type",
    }),
    customer_id: z
      .union([z.string(), z.number()])
      .refine((v) => v !== "" && v !== undefined && v !== null, {
        message: "Customer is required",
      }),
    assigned_to: z.string().min(1, "Assignee is required"),
    start_date: z.string().datetime({ message: "Invalid start date" }),
    delivery_date: z.string().datetime({ message: "Invalid delivery date" }),
    priority: z.enum(["Normal", "High", "Urgent"]),
    client_status: z.enum(["Confirmed", "Correction"]),
    // GmailFileUploader tracks each pick as an upload-in-progress object
    // ({status, path, ...}), not a raw File - optional since attachments
    // aren't required to create a project.
    images: z.array(z.any()).optional(),
    description: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.delivery_date) >= new Date(data.start_date),
    {
      message: "Delivery date cannot be before the start date",
      path: ["delivery_date"],
    },
  );

export type AddProjectFormData = z.infer<typeof addProjectSchema>;
