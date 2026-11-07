import { forwardRef } from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { CustomerStatement } from "../../api/types";
import { formatDate } from "../../format/date";
import { formatAmount, formatInr } from "../../format/money";
import { documentTokens } from "../../theme/tokens";
import { Label, Logo } from "./DocumentSheet";
import { resolveDocumentStyle } from "./documentTemplates";
import { useDocumentSettings } from "./useDocumentSettingsStore";

const COLS = "100px 128px minmax(0, 1fr) 88px 80px 92px";
const PAY_COLS = "100px minmax(0, 1fr) 100px";

// A customer's statement, in the same branding as their invoices (see
// DocumentSheet.tsx): every bill in the period, what's paid, what's owed.
const StatementSheet = forwardRef<HTMLDivElement, { statement: CustomerStatement; period: string }>(
  function StatementSheet({ statement, period }, ref) {
    const { settings, logoUrl } = useDocumentSettings();
    const s = resolveDocumentStyle(settings);
    const { customer } = statement;
    const name = customer.company_name ?? `${customer.first_name} ${customer.last_name}`.trim();
    const contactLines = [
      ...(customer.company_name ? [`${customer.first_name} ${customer.last_name}`.trim()] : []),
      ...(customer.company_address ? customer.company_address.split("\n").map((l) => l.trim()).filter(Boolean) : []),
      customer.contact_number,
      ...(customer.email ? [customer.email] : []),
    ];
    const footerContact = [settings.business_name, settings.phone, settings.email, settings.website].filter(Boolean).join("  |  ");
    const px = { xs: 2.5, sm: 5.5 };

    const summary = [
      { label: "Billed", value: statement.total_billed },
      { label: "Paid", value: statement.total_paid },
      { label: "Balance", value: statement.total_balance },
    ];

    return (
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          maxWidth: 840,
          mx: "auto",
          bgcolor: documentTokens.paper,
          color: s.ink,
          borderRadius: s.cardRadius,
          border: "1px solid var(--slate-200)",
          overflow: "hidden",
        }}
      >
        {settings.show_top_bar && s.supportsTopBar && <Box sx={{ height: 12, bgcolor: s.primary }} />}

        <Box sx={{ px, pt: 5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Logo logoUrl={logoUrl} name={settings.business_name} height={s.logoHeight} />
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: s.title.size, fontWeight: s.title.weight, lineHeight: 1, letterSpacing: s.title.letterSpacing, color: s.title.color }}>
              STATEMENT
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: s.muted, mt: 0.75 }}>{period}</Typography>
          </Box>
        </Box>

        <Box sx={{ px, pb: 4 }}>
          <Box sx={{ mt: s.sectionGap, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
            <Box>
              <Label s={s}>Statement for</Label>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 0.75 }}>{name}</Typography>
              {contactLines.map((line, i) => (
                <Typography key={i} sx={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
                  {line}
                </Typography>
              ))}
            </Box>
            <Box>
              <Label s={s}>From</Label>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 0.75 }}>{settings.business_name}</Typography>
              {[...(settings.address ?? "").split("\n"), settings.phone, settings.email]
                .map((l) => l?.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <Typography key={i} sx={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
                    {line}
                  </Typography>
                ))}
              <Typography sx={{ fontSize: "0.8rem", color: s.muted, mt: 0.5 }}>Issued {formatDate(statement.generated_at)}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: s.sectionGap, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: `1px solid ${s.hairline}`, borderRadius: "8px" }}>
            {summary.map((item, i) => (
              <Box key={item.label} sx={{ px: 2, py: 1.5, borderLeft: i ? `1px solid ${s.hairline}` : "none" }}>
                <Label s={s}>{item.label}</Label>
                <Typography sx={{ mt: 0.5, fontSize: "1.05rem", fontWeight: 700 }}>{formatInr(item.value)}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: s.sectionGap }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: COLS,
                gap: 1,
                px: 2,
                py: 1.25,
                borderRadius: s.tableHeader.radius,
                bgcolor: s.tableHeader.bg,
                color: s.tableHeader.color,
                borderBottom: s.tableHeader.rule ? `1px solid ${s.tableHeader.rule}` : "none",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span>Date</span>
              <span>Invoice</span>
              <span>Job</span>
              <span style={{ textAlign: "right" }}>Amount</span>
              <span style={{ textAlign: "right" }}>Paid</span>
              <span style={{ textAlign: "right" }}>Balance</span>
            </Box>

            {statement.rows.length === 0 ? (
              <Typography sx={{ px: 2, py: 3, fontSize: "0.9rem", color: s.muted, textAlign: "center" }}>
                No bills in this period.
              </Typography>
            ) : (
              statement.rows.map((row) => (
                <Box
                  key={row.invoice_id}
                  className="invoice-row"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: COLS,
                    gap: 1,
                    alignItems: "baseline",
                    px: 2,
                    py: 1.25,
                    borderBottom: `1px solid ${s.hairline}`,
                    fontSize: "0.88rem",
                  }}
                >
                  <span style={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</span>
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{row.invoice_number}</span>
                  <span style={{ color: s.muted, overflowWrap: "anywhere" }}>{row.job ?? "-"}</span>
                  <span style={{ textAlign: "right" }}>{formatAmount(row.amount)}</span>
                  <span style={{ textAlign: "right" }}>{formatAmount(row.paid)}</span>
                  <span style={{ textAlign: "right", fontWeight: row.balance > 0 ? 700 : 400 }}>{formatAmount(row.balance)}</span>
                </Box>
              ))
            )}
          </Box>

          <Box className="invoice-row" sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
            <Box
              sx={{
                minWidth: { xs: "100%", sm: 300 },
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 3,
                px: 2,
                py: 1.5,
                borderRadius: s.totalBar.radius,
                bgcolor: s.totalBar.bg,
                color: s.totalBar.color,
                border: s.totalBar.border,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Total outstanding
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: s.totalBar.size }}>{formatInr(statement.total_outstanding)}</Typography>
            </Box>
          </Box>
          {statement.total_outstanding !== statement.total_balance && (
            <Typography sx={{ mt: 1, fontSize: "0.78rem", color: s.muted, textAlign: "right" }}>
              Includes every unpaid bill, not just this period's.
            </Typography>
          )}
          {statement.credit > 0 && (
            <Typography sx={{ mt: 1, fontSize: "0.85rem", fontWeight: 600, textAlign: "right" }}>
              Credit available: {formatInr(statement.credit)} (paid in advance, not yet on a bill)
            </Typography>
          )}

          {statement.payments.length > 0 && (
            <Box className="invoice-row" sx={{ mt: s.sectionGap }}>
              <Label s={s}>Payments received</Label>
              <Box sx={{ mt: 1, border: `1px solid ${s.hairline}`, borderRadius: "8px" }}>
                {statement.payments.map((p, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: PAY_COLS,
                      gap: 1,
                      alignItems: "baseline",
                      px: 2,
                      py: 1.1,
                      borderTop: i ? `1px solid ${s.hairline}` : "none",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{formatDate(p.date)}</span>
                    <span style={{ color: s.muted, overflowWrap: "anywhere" }}>
                      {p.payment_method}
                      {p.payment_reference ? ` · ${p.payment_reference}` : ""}
                      {p.applied_to.length ? ` — for ${p.applied_to.join(", ")}` : ""}
                      {p.unused > 0 ? ` (${formatInr(p.unused)} kept as credit)` : ""}
                    </span>
                    <span style={{ textAlign: "right", fontWeight: 700 }}>{formatAmount(p.amount)}</span>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box className="invoice-row" sx={{ mt: s.sectionGap + 2, pt: 2.5, borderTop: `1px solid ${s.hairline}`, textAlign: "center" }}>
            {settings.footer_message && (
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: s.primary }}>{settings.footer_message}</Typography>
            )}
            {footerContact && <Typography sx={{ fontSize: "0.78rem", color: s.muted, mt: 0.5 }}>{footerContact}</Typography>}
          </Box>
        </Box>
      </Paper>
    );
  },
);

export default StatementSheet;
