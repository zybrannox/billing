import { addProjectFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { getImageDimensions } from "../../utils/appSupport";
import { useDialogStore } from "../../store/useDialogStore";
import CustomForm from "../components/CustomForm";
import { compressImage } from "../../utils/imageCompression";

export default function AddProject() {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();

  const handleSubmit = async (formData: any) => {
    const { images, ...rest } = formData;
    console.log("Submitting Project. Images:", images);
    console.log(formData);

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

      // 2️⃣ Upload images if any
      if (images && images.length > 0 && project?.id) {
        const formDataToSend = new FormData();
        const metadata: any[] = [];
        const imageList = Array.isArray(images) ? images : [images];

        for (const img of imageList) {
          // Compress image before upload
          const compressedFile = await compressImage(img);
          formDataToSend.append("files", compressedFile);

          const dimensions = await getImageDimensions(img);
          metadata.push({
            filename: img.name,
            width: dimensions?.width || null,
            height: dimensions?.height || null,
          });
        }

        formDataToSend.append("metadata", JSON.stringify(metadata));

        await sendRequest({
          endpoint: `/files/upload/${project.id}`,
          method: "post",
          data: formDataToSend,
        });
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
