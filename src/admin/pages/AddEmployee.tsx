import CustomForm from "../../common/components/CustomForm";
import { addEmployeeFields } from "../../config/admin";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { addEmployeeSchema } from "../../schemas/addEmployee.schema";

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
    <CustomForm
      fields={addEmployeeFields}
      onSubmit={handleSubmit}
      buttonName={loading ? "Submitting..." : "Add Employee"}
      loading={loading}
      zodSchema={addEmployeeSchema}
    />
  );
}
