import CustomForm from "../components/CustomForm";
import { addCustomerFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";

interface AddCustomerProps {
  onSuccess?: () => void;
}

export default function AddCustomer({ onSuccess }: AddCustomerProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();

  const handleSubmit = async (formData: any) => {
    const result = await sendRequest({
      endpoint: "/customers/",
      method: "post",
      data: formData,
      onError: (err) => {
        console.error("Error adding customer", err);
      },
    });

    if (result) {
      closeDialog();
      onSuccess?.();
    }
  };

  return (
    <CustomForm
      fields={addCustomerFields}
      onSubmit={handleSubmit}
      buttonName={loading ? "Submitting..." : "Add Customer"}
      loading={loading}
    />
  );
}
