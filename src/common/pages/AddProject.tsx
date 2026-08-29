import { useEffect, useMemo, useRef } from "react";
import { addProjectFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { useAppStore } from "../../store/useAppStore";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import { apiService } from "../../api/service";
import CustomForm from "../components/CustomForm";
import type { UploadItem } from "../../ui/GmailFileUploader";
import { addProjectSchema } from "../../schemas/addProject.schema";

export default function AddProject() {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const { user } = useAppStore();
  const imagesRef = useRef<UploadItem[]>([]);
  const submittedRef = useRef(false);

  // Project Type's options now live in the admin-managed list_options table
  // (see admin/pages/SystemSetup.tsx) instead of the hardcoded array in
  // config/common.ts - fetched once and cached (see useListOptionsStore),
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
          apiService.delete(`/files/${encodeURIComponent(item.path!)}`).catch(() => {});
        });
    };
  }, []);

  // Only admins assign projects to someone else. Everyone else can only be
  // assigned to themselves, so lock the field to their own name. `assigned_to`
  // is an async_select keyed by username (see config/common.ts), and its
  // options come from GET /users - but the field's single-record hydration
  // fetch looks up GET /users/{value} expecting a numeric id, so a raw
  // username there 422s and the field would show blank. initialOption
  // hands it an already-resolved option so it never needs that lookup.
  const fields = useMemo(() => {
    const withLiveProjectTypes = addProjectFields.map((field) =>
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
  }, [user, projectTypeOptions]);

  const handleSubmit = async (formData: any) => {
    const { images, ...rest } = formData;
    const items: UploadItem[] = images || [];

    // Images upload as soon as they're picked (see GmailFileUploader), so by
    // the time the form submits they should already be "done". Block submit
    // if any are still in flight rather than silently dropping them.
    if (items.some((item) => item.status === "uploading")) {
      alert("Please wait for all files to finish uploading before submitting.");
      return;
    }

    const attachedFiles = items
      .filter((item) => item.status === "done" && item.path)
      .map((item) => ({
        path: item.path,
        original_name: item.name,
        width: item.width ?? null,
        height: item.height ?? null,
      }));

    try {
      // 1️⃣ Create project
      const projectPayload = {
        ...rest,
        print_status: "In Progress",
      };

      const project = await sendRequest({
        endpoint: "/projects/",
        method: "post",
        data: projectPayload,
      });

      // The project now exists, so these uploads are its responsibility
      // (or, if attaching them below fails, the already-shown "edit the
      // project and re-add them" message covers that) - either way, they
      // are no longer orphaned uploads for the cancel-cleanup to delete.
      if (project) submittedRef.current = true;

      // 2️⃣ Link already-uploaded files to the new project (no re-upload)
      if (attachedFiles.length > 0 && project?.id) {
        const attachResult = await sendRequest({
          endpoint: `/files/attach/${project.id}`,
          method: "post",
          data: { files: attachedFiles },
        });

        if (!attachResult) {
          alert(
            "Project was created, but attaching the uploaded files failed. Please edit the project and re-add them.",
          );
        }
      }

      closeDialog();
      window.location.reload(); // Refresh to show new project
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
      }}
    />
  );
}
