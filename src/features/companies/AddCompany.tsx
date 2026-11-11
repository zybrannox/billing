import type { z } from "zod";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import CustomForm from "../../ui/CustomForm";
import { addCompanyFields } from "./fields";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useDialogStore } from "../../store/useDialogStore";
import { addCompanySchema } from "./addCompany.schema";
import { getErrorMessage } from "../../utils/apiError";

interface AddCompanyProps {
  onSuccess?: () => void;
}

export default function AddCompany({ onSuccess }: AddCompanyProps) {
  const { sendRequest, loading } = useApiRequest();
  const { closeDialog } = useDialogStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: z.infer<typeof addCompanySchema>) => {
    setErrorMessage(null);
    const result = await sendRequest({
      endpoint: "/companies/",
      // The form shows a failure itself, next to the fields.
      notify: "success",
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
        setErrorMessage(getErrorMessage(err, "Something went wrong while adding the company. Please try again."));
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
