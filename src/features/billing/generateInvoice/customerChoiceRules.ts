import { cleanPhone, isValidPhone } from "../../projects/addProject.schema";

// Who a new invoice or quotation is for: someone already saved, or someone new.
export interface CustomerChoiceValue {
  mode: "existing" | "new";
  customerId?: number;
  name: string;
  phone: string;
}

export const emptyCustomerChoice = (customerId?: number): CustomerChoiceValue => ({
  mode: "existing",
  customerId,
  name: "",
  phone: "",
});

// What's stopping it being used, or null when it's fine.
export const customerChoiceProblem = (choice: CustomerChoiceValue): string | null => {
  if (choice.mode === "existing") return choice.customerId ? null : "Pick a customer before generating.";
  if (!choice.name.trim()) return "Enter the customer's name.";
  if (choice.name.trim().length > 100) return "Keep the customer's name under 100 characters.";
  return isValidPhone(choice.phone) ? null : "Enter a valid phone number.";
};

// The part of a request body that says who it's for.
export const customerChoicePayload = (choice: CustomerChoiceValue) =>
  choice.mode === "existing"
    ? { customer_id: choice.customerId }
    : { new_customer: { name: choice.name.trim(), contact_number: cleanPhone(choice.phone) } };
