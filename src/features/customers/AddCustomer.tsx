import type { z } from "zod";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import CustomForm from "../../ui/CustomForm";
import { addCustomerFields } from "./fields";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { addCustomerSchema } from "./addCustomer.schema";
import { getErrorMessage } from "../../utils/apiError";

interface AddCustomerProps {
  onSuccess?: () => void;
}

export default function AddCustomer({ onSuccess }: AddCustomerProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: z.infer<typeof addCustomerSchema>) => {
    setErrorMessage(null);
    const result = await sendRequest({
      endpoint: "/customers/",
      method: "post",
      data: { ...formData, email: formData.email || undefined },
      onError: (err) => {
        console.error("Error adding customer", err);
        setErrorMessage(getErrorMessage(err, "Something went wrong while adding the customer. Please try again."));
      },
    });

    if (result) {
      closeDialog();
      onSuccess?.();
    }
  };

  return (
    <div>
      {errorMessage && (
        <Alert severity="error" sx={{ mx: 2.5, mt: 2.5 }}>
          {errorMessage}
        </Alert>
      )}
      <CustomForm
        fields={addCustomerFields}
        onSubmit={handleSubmit}
        buttonName={loading ? "Submitting..." : "Add Customer"}
        loading={loading}
        zodSchema={addCustomerSchema}
      />
    </div>
  );
}
