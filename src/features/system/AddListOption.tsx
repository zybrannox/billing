import { useState } from "react";
import Alert from "@mui/material/Alert";
import CustomForm, { type FieldDefinition } from "../../ui/CustomForm";
import { useListOptionsStore } from "../../store/useListOptionsStore";
import { addListOptionSchema, addPricedListOptionSchema } from "./addListOption.schema";
import { getErrorMessage } from "../../utils/apiError";

interface AddListOptionProps {
  category: string;
  label: string; // e.g. "Project Type" - drives the field's label/placeholder
  // Pricing categories (e.g. "item_type") get an extra Rate field, and a
  // rate becomes part of what's actually being added, not just a label.
  hasRate?: boolean;
  onSuccess?: () => void;
}

export default function AddListOption({ category, label, hasRate = false, onSuccess }: AddListOptionProps) {
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
      row: hasRate ? 1 : undefined,
    },
    ...(hasRate
      ? ([
          {
            name: "rate",
            label: "Rate (₹ per sq ft)",
            type: "number",
            placeholder: "0.00",
            required: true,
            min: 0,
            row: 1,
          },
        ] as FieldDefinition[])
      : []),
  ];

  const handleSubmit = async (formData: { value: string; rate?: number }) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await addOption(category, formData.value, hasRate ? Number(formData.rate) : undefined);
      onSuccess?.();
    } catch (err) {
      console.error("Error adding option", err);
      setErrorMessage(getErrorMessage(err, "Something went wrong while adding this option. Please try again."));
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
        zodSchema={hasRate ? addPricedListOptionSchema : addListOptionSchema}
      />
    </div>
  );
}
