import { useState } from "react";
import Alert from "@mui/material/Alert";
import CustomForm from "../components/CustomForm";
import { addCustomerFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { addCustomerSchema } from "../../schemas/addCustomer.schema";

interface AddCustomerProps {
  onSuccess?: () => void;
}

// FastAPI error bodies are either {detail: string} (HTTPException) or
// {detail: [{msg, loc, ...}]} (pydantic validation) - normalize both to
// a single displayable line rather than showing "[object Object]".
const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while adding the customer. Please try again.";
};

export default function AddCustomer({ onSuccess }: AddCustomerProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: any) => {
    setErrorMessage(null);
    const result = await sendRequest({
      endpoint: "/customers/",
      method: "post",
      data: { ...formData, email: formData.email || undefined },
      onError: (err) => {
        console.error("Error adding customer", err);
        setErrorMessage(extractErrorMessage(err));
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
