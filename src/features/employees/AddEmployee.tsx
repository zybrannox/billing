import CustomForm from "../../ui/CustomForm";
import { addEmployeeFields } from "./fields";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { addEmployeeSchema } from "./addEmployee.schema";
import { API } from "../../api/endpoints";

interface AddEmployeeProps {
  onSuccess?: () => void;
}

export default function AddEmployee({ onSuccess }: AddEmployeeProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();

  const handleSubmit = async (formData: any) => {
    const result = await sendRequest({
      endpoint: API.users.list,
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
