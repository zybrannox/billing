import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomForm from "../components/CustomForm";
import { generateInvoiceFields } from "../../config/common";
import { useDialogStore } from "../../store/useDialogStore";
import { useInvoiceStore } from "../../store/useInvoiceStore";

interface GenerateInvoiceProps {
  onSuccess?: () => void;
}

export default function GenerateInvoice({ onSuccess }: GenerateInvoiceProps) {
  const { editingId, closeDialog } = useDialogStore();
  const { addInvoice } = useInvoiceStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (formData: any) => {
    if (!editingId) return;

    setLoading(true);
    try {
      const invoice = await addInvoice({
        project_id: Number(editingId),
        amount: formData.amount,
        status: "pending",
        due_date: formData.due_date || null,
      });
      closeDialog();
      onSuccess?.();
      // Take the user straight to the printable document for the invoice
      // they just created.
      navigate(`/admin/invoices/${invoice.id}`);
    } catch (err) {
      console.error("Error generating invoice", err);
      alert("Failed to generate invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomForm
      fields={generateInvoiceFields}
      onSubmit={handleSubmit}
      buttonName="Generate Invoice"
      loading={loading}
    />
  );
}
