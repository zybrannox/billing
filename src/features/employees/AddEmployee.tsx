import type { z } from "zod";
import { useState } from "react";
import { Alert } from "@mui/material";
import CustomForm from "../../ui/CustomForm";
import { getErrorMessage } from "../../utils/apiError";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: z.infer<typeof addEmployeeSchema>) => {
    setErrorMessage(null);
    const result = await sendRequest({
      endpoint: API.users.list,
      // The form shows a failure itself, next to the fields.
      notify: "success",
      method: "post",
      data: formData,
      onError: (err) => {
        console.error("Error adding employee", err);
        setErrorMessage(getErrorMessage(err, "Something went wrong while adding the employee. Please try again."));
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
        fields={addEmployeeFields}
        onSubmit={handleSubmit}
        buttonName={loading ? "Submitting..." : "Add Employee"}
        loading={loading}
        zodSchema={addEmployeeSchema}
      />
    </div>
  );
}
