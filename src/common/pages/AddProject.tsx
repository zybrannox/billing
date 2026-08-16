import { addProjectFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import CustomForm from "../components/CustomForm";
import type { UploadItem } from "../../ui/GmailFileUploader";

export default function AddProject() {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();

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
        print_status: "Pending",
      };

      const project = await sendRequest({
        endpoint: "/projects/",
        method: "post",
        data: projectPayload,
      });

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
      fields={addProjectFields}
      onSubmit={handleSubmit}
      buttonName="Add Project"
      loading={loading}
    />
  );
}
