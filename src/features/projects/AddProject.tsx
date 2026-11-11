import type { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { addProjectFields } from "./fields";
import { cleanPhone } from "./addProject.schema";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { useAppStore } from "../../store/useAppStore";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import { apiService } from "../../api/service";
import CustomForm from "../../ui/CustomForm";
import type { UploadItem } from "../../ui/GmailFileUploader";
import { addProjectSchema } from "./addProject.schema";
import { messages } from "../../messages";
import { notify } from "../../store/useNoticeStore";
import { projectLink } from "../../api/actionNotices";

export default function AddProject() {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const { user } = useAppStore();
  const imagesRef = useRef<UploadItem[]>([]);
  const submittedRef = useRef(false);
  const [customerMode, setCustomerMode] = useState("existing");

  // Project Type's options now live in the admin-managed list_options table
  // (see features/system/SystemSetup.tsx) instead of the hardcoded array in
  // fields.ts - fetched once and cached (see useListOptionsStore),
  // not re-fetched every time this dialog opens. The hardcoded array stays
  // as the field's default `options` below so the form still renders
  // correctly for the brief moment before this fetch resolves, rather than
  // showing an empty dropdown.
  const fetchActiveOptions = useListOptionsStore((s) => s.fetchActiveOptions);
  const projectTypeOptions = useListOptionsStore(
    (s) => s.activeByCategory["project_type"],
  );

  useEffect(() => {
    fetchActiveOptions("project_type");
  }, [fetchActiveOptions]);

  useEffect(() => {
    return () => {
      if (submittedRef.current) return;
      imagesRef.current
        .filter((item) => item.status === "done" && item.path)
        .forEach((item) => {
          // Quiet: tidying up files picked for a project that was never added.
          apiService.delete(`/files/${encodeURIComponent(item.path!)}`, { notify: false }).catch(() => {});
        });
    };
  }, []);

  // Only admins assign projects to someone else. Everyone else can only be
  // assigned to themselves, so lock the field to their own name. `assigned_to`
  // is an async_select keyed by username (see fields.ts), and its
  // options come from GET /users - but the field's single-record hydration
  // fetch looks up GET /users/{value} expecting a numeric id, so a raw
  // username there 422s and the field would show blank. initialOption
  // hands it an already-resolved option so it never needs that lookup.
  const fields = useMemo(() => {
    const hidden = customerMode === "new" ? ["customer_id"] : ["new_customer_name", "new_customer_phone"];
    const withLiveProjectTypes = addProjectFields
      .filter((field) => !hidden.includes(field.name))
      .map((field) =>
        field.name === "project_type" && projectTypeOptions?.length
          ? { ...field, options: projectTypeOptions.map((o) => o.value) }
          : field,
      );

    if (user?.role === "admin") return withLiveProjectTypes;

    return withLiveProjectTypes.map((field) =>
      field.name === "assigned_to"
        ? {
            ...field,
            defaultValue: user?.username ?? "",
            disabled: true,
            initialOption: user ? { username: user.username } : undefined,
          }
        : field,
    );
  }, [user, projectTypeOptions, customerMode]);

  const handleSubmit = async (formData: z.infer<typeof addProjectSchema> & { images?: UploadItem[] }) => {
    const { images, customer_mode, customer_id, new_customer_name, new_customer_phone, ...rest } = formData;
    const items: UploadItem[] = images || [];

    // Images upload as soon as they're picked (see GmailFileUploader), so by
    // the time the form submits they should already be "done". Block submit
    // if any are still in flight rather than silently dropping them.
    if (items.some((item) => item.status === "uploading")) {
      notify.warning(messages.errors.uploadsPending);
      return;
    }
    // A failed file used to be dropped without a word, leaving a project that
    // looked fine but was missing its artwork.
    if (items.some((item) => item.status === "error")) {
      notify.error(messages.errors.uploadsFailed);
      return;
    }

    const attachedFiles = items
      .filter((item) => item.status === "done" && item.path)
      .map((item) => ({
        path: item.path,
        original_name: item.name,
        width: item.width ?? null,
        height: item.height ?? null,
        pixel_width: item.pixelWidth ?? null,
        pixel_height: item.pixelHeight ?? null,
      }));

    try {
      // 1️⃣ Create project
      const projectPayload = {
        ...rest,
        ...(customer_mode === "new"
          ? { new_customer: { name: new_customer_name, contact_number: cleanPhone(new_customer_phone ?? "") } }
          : { customer_id }),
        print_status: "In Progress",
      };

      const project = await sendRequest<{ id: number }>({
        endpoint: "/projects/",
        method: "post",
        data: projectPayload,
        // A failure is announced with its reason; success is said once, below,
        // together with the files.
        notify: "errors",
      });

      // Keep the form and what was typed, rather than closing as if it worked.
      if (!project) return;

      // The project now exists, so these uploads are its responsibility
      // (or, if attaching them below fails, the already-shown "edit the
      // project and re-add them" message covers that) - either way, they
      // are no longer orphaned uploads for the cancel-cleanup to delete.
      submittedRef.current = true;

      // 2️⃣ Link already-uploaded files to the new project (no re-upload)
      if (attachedFiles.length > 0) {
        const attachResult = await sendRequest({
          endpoint: `/files/attach/${project.id}`,
          method: "post",
          data: { files: attachedFiles },
          notify: false,
        });

        if (!attachResult) {
          notify.error("Project added, but its files weren't attached", {
            message: "Open the project's files and add them again.",
            action: { label: "Show project", to: projectLink(project.id) },
          });
          closeDialog();
          return;
        }
      }

      const files = attachedFiles.length;
      notify.success("Project added", {
        message: files ? `With ${files} ${files === 1 ? "file" : "files"}.` : undefined,
        action: { label: "Show project", to: projectLink(project.id) },
      });
      // The projects list refreshes itself when this dialog closes (Projects.tsx).
      closeDialog();
    } catch (error) {
      console.error("Error creating project:", error);
      // Error is already handled by useApiRequest hook
    }
  };

  return (
    <CustomForm
      fields={fields}
      onSubmit={handleSubmit}
      buttonName="Add Project"
      loading={loading}
      zodSchema={addProjectSchema}
      onValuesChange={(values) => {
        imagesRef.current = values.images || [];
        setCustomerMode(values.customer_mode ?? "existing");
      }}
    />
  );
}
