// Mirrors the backend's DocumentSettingsRead (app/document_settings/model.py).
export interface DocumentSettings {
  business_name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  has_logo: boolean;
  template: string;
  theme: string;
  custom_color: string | null;
  show_top_bar: boolean;
  show_payment_history: boolean;
  tax_label: string;
  tax_note: string;
  invoice_terms: string | null;
  quotation_terms: string | null;
  footer_message: string;
}

// What the document renders with until the real settings arrive (and what
// the backend itself creates on first read) - a document never waits on, or
// breaks without, the settings request.
export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  business_name: "Zybrannox",
  tagline: "Printing & Signage Services",
  address: "5/90 Melachunda Vilai, Karungal (P.O),\nKanyakumari, Tamil Nadu 629157",
  phone: "+91 84386 08478",
  email: null,
  website: null,
  tax_id: null,
  has_logo: false,
  template: "classic",
  theme: "indigo",
  custom_color: null,
  show_top_bar: true,
  show_payment_history: true,
  tax_label: "Tax / GST",
  tax_note: "As applicable",
  invoice_terms: null,
  quotation_terms:
    "This is an estimate, not a bill - amounts are subject to change until converted to an invoice.",
  footer_message: "Thank you for your business.",
};
