// The ways a payment can have been received (recorded by hand - there is no
// payment gateway). Mirrors the backend's PaymentMethod literal
// (app/invoices/model.py); the API rejects anything else.
export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Card" | "Cheque" | "Other";

export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Other"];
