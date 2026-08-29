import { useState } from "react";
import Alert from "@mui/material/Alert";
import CustomForm, { type FieldDefinition } from "../components/CustomForm";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import { addListOptionSchema } from "../../schemas/addListOption.schema";

interface AddListOptionProps {
  category: string;
  label: string; // e.g. "Project Type" - drives the field's label/placeholder
  onSuccess?: () => void;
}

// FastAPI error bodies are either {detail: string} (HTTPException, e.g. the
// duplicate-value 400) or {detail: [{msg, loc, ...}]} (pydantic validation)
// - normalize both to a single displayable line rather than showing
// "[object Object]" (same helper as AddCustomer.tsx).
const extractErrorMessage = (err: any): string => {
  const detail = err?.detail ?? err?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return "Something went wrong while adding this option. Please try again.";
};

export default function AddListOption({ category, label, onSuccess }: AddListOptionProps) {
  const addOption = useListOptionsStore((s) => s.addOption);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fields: FieldDefinition[] = [
    {
      name: "value",
      label,
      type: "text",
      placeholder: `Enter ${label.toLowerCase()}`,
      required: true,
      row: 1,
    },
  ];

  const handleSubmit = async (formData: any) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await addOption(category, formData.value);
      onSuccess?.();
    } catch (err: any) {
      console.error("Error adding option", err);
      setErrorMessage(extractErrorMessage(err?.response?.data || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      <CustomForm
        fields={fields}
        onSubmit={handleSubmit}
        buttonName={loading ? "Adding..." : `Add ${label}`}
        loading={loading}
        zodSchema={addListOptionSchema}
      />
    </div>
  );
}
