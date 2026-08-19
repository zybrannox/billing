import { useEffect, useMemo, useRef } from "react";
import { addProjectFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { useAppStore } from "../../store/useAppStore";
import { apiService } from "../../api/service";
import CustomForm from "../components/CustomForm";
import type { UploadItem } from "../../ui/GmailFileUploader";

export default function AddProject() {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const { user } = useAppStore();
  const imagesRef = useRef<UploadItem[]>([]);
  const submittedRef = useRef(false);

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
  // assigned to themselves, so lock the field to their own name.
  const fields = useMemo(() => {
    if (user?.role === "admin") return addProjectFields;

    return addProjectFields.map((field) =>
      field.name === "assigned_to"
        ? { ...field, defaultValue: user?.username ?? "", disabled: true }
        : field,
    );
  }, [user]);

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
      onValuesChange={(values) => {
        imagesRef.current = values.images || [];
      }}
    />
  );
}
