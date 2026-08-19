import CustomForm from "../../common/components/CustomForm";
import { changePasswordFields } from "../../config/admin";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { API } from "../../api/endpoints";

interface ChangePasswordProps {
  userId: number;
  onSuccess?: () => void;
}

export default function ChangePassword({ userId, onSuccess }: ChangePasswordProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();

  const handleSubmit = async (formData: any) => {
    const result = await sendRequest({
      endpoint: API.users.password(String(userId)),
      method: "patch",
      data: formData,
      onError: (err) => {
        console.error("Error changing password", err);
        alert(err?.detail || "Failed to change password");
      },
    });

    if (result) {
      closeDialog();
      onSuccess?.();
    }
  };

  return (
    <CustomForm
      fields={changePasswordFields}
      onSubmit={handleSubmit}
      buttonName={loading ? "Updating..." : "Update Password"}
      loading={loading}
    />
  );
}
