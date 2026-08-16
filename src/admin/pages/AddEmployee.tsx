import CustomForm from "../../common/components/CustomForm";
import { addEmployeeFields } from "../../config/admin";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";

interface AddEmployeeProps {
  onSuccess?: () => void;
}

export default function AddEmployee({ onSuccess }: AddEmployeeProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();

  const handleSubmit = async (formData: any) => {
    const result = await sendRequest({
      endpoint: "/users/",
      method: "post",
      data: formData,
      onError: (err) => {
        console.error("Error adding employee", err);
      },
    });

    if (result) {
      closeDialog();
      onSuccess?.();
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Add Employee</h2>

      <CustomForm
        fields={addEmployeeFields}
        onSubmit={handleSubmit}
        buttonName={loading ? "Submitting..." : "Add Employee"}
        loading={loading}
      />
    </div>
  );
}
