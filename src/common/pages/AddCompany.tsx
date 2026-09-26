import { useState } from "react";
import Alert from "@mui/material/Alert";
import CustomForm from "../components/CustomForm";
import { addCompanyFields } from "../../config/common";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { addCompanySchema } from "../../schemas/addCompany.schema";

interface AddCompanyProps {
  onSuccess?: () => void;
}

// FastAPI error bodies are either {detail: string} (HTTPException) or
// {detail: [{msg, loc, ...}]} (pydantic validation) - normalize both to
// a single displayable line rather than showing "[object Object]".
const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while adding the company. Please try again.";
};

export default function AddCompany({ onSuccess }: AddCompanyProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: any) => {
    setErrorMessage(null);
    const result = await sendRequest({
      endpoint: "/companies/",
      method: "post",
      data: {
        ...formData,
        billing_email: formData.billing_email || undefined,
        phone: formData.phone || undefined,
        billing_address: formData.billing_address || undefined,
        notes: formData.notes || undefined,
      },
      onError: (err) => {
        console.error("Error adding company", err);
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
        fields={addCompanyFields}
        onSubmit={handleSubmit}
        buttonName={loading ? "Submitting..." : "Add Company"}
        loading={loading}
        zodSchema={addCompanySchema}
      />
    </div>
  );
}
