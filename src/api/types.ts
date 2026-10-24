// Request/response types, derived from the backend's OpenAPI document
// (schema.d.ts is generated - never edit it; see docs/architecture.md).
// Import types from here, not from schema.d.ts, so a backend rename only
// needs fixing in this one file.
//
// Refresh after a backend change:
//   (billing_server) ./venv/bin/python scripts/export_openapi.py
//   (billing)        pnpm api:types
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Invoice = Schemas["InvoiceRead"];
export type InvoiceDetail = Schemas["InvoiceDetailRead"];
export type InvoiceItem = Schemas["InvoiceItemRead"];
export type InvoicePayment = Schemas["InvoicePaymentRead"];
export type InvoiceListResponse = Schemas["InvoiceListResponse"];

export type Quotation = Schemas["QuotationRead"];
export type QuotationDetail = Schemas["QuotationDetailRead"];
export type QuotationItem = Schemas["QuotationItemRead"];
export type QuotationListResponse = Schemas["QuotationListResponse"];

export type InvoicePreview = Schemas["InvoicePreviewRead"];
export type InvoiceProject = Schemas["ProjectSummary"];
export type InvoiceProjectFile = Schemas["ProjectFileSummary"];

export type AuditLogEntry = Schemas["AuditLogRead"];
export type AuditLogListResponse = Schemas["AuditLogListResponse"];

export type SystemHealth = Schemas["SystemHealthRead"];
export type HealthPoint = Schemas["HealthPointRead"];
export type HealthFinding = Schemas["FindingRead"];
