import { forwardRef, type ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { useDocumentSettings } from "./useDocumentSettingsStore";
import { resolveDocumentStyle, type DocumentStyle } from "./documentTemplates";
import { documentTokens } from "../../theme/tokens";
import type { DocumentSettings } from "./documentSettings";
import type { DocumentData } from "./documentTypes";

// The one printed-document renderer - header with logo and title, dates,
// Billed To / From, line-item table, totals, terms, payment history, footer.
// Three inputs shape it: `data` (what this particular document says), the
// document settings (the shop's branding, wording, toggles and chosen
// template/colour), and the resolved DocumentStyle (see documentTemplates.ts)
// that turns template + colour into concrete tokens. Nothing here branches on
// *which* template is active - a template only changes the tokens.
// Pass `settings`/`logoUrl` explicitly to preview unsaved choices (System
// Setup does); otherwise the saved ones are used.
//
// The root keeps the `invoice-sheet` class: the invoice dialog's print and
// PDF-export styles (features/billing/InvoiceView.tsx) select on it.

const lines = (text: string | null | undefined) =>
  (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

function Label({ s, children }: { s: DocumentStyle; children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: s.label,
      }}
    >
      {children}
    </Typography>
  );
}

function Logo({ logoUrl, name, height }: { logoUrl: string | null; name: string; height: number }) {
  if (logoUrl) {
    return (
      <Box
        component="img"
        src={logoUrl}
        alt={name}
        sx={{ height, maxWidth: 240, objectFit: "contain", display: "block" }}
      />
    );
  }
  // Built-in brand mark: icon + wordmark, as two assets so the pair scales
  // together at any size.
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box component="img" src="/images/logo.webp" alt="" sx={{ height: height * 0.77, display: "block" }} />
      <Box component="img" src="/images/logo_text.webp" alt={name} sx={{ height: height * 0.5, display: "block" }} />
    </Box>
  );
}

const COLS = "36px minmax(0, 1fr) 64px 100px 120px";

const DocumentSheet = forwardRef<
  HTMLDivElement,
  {
    data: DocumentData;
    settings?: DocumentSettings;
    logoUrl?: string | null;
  }
>(function DocumentSheet({ data, settings: settingsProp, logoUrl: logoProp }, ref) {
  const saved = useDocumentSettings();
  const settings = settingsProp ?? saved.settings;
  const logoUrl = logoProp !== undefined ? logoProp : saved.logoUrl;
  const s = resolveDocumentStyle(settings);

  const fromLines = [
    ...lines(settings.address),
    ...(settings.phone ? [settings.phone] : []),
    ...(settings.email ? [settings.email] : []),
    ...(settings.website ? [settings.website] : []),
    ...(settings.tax_id ? [`GSTIN: ${settings.tax_id}`] : []),
  ];
  const footerContact = [settings.business_name, settings.phone, settings.email, settings.website]
    .filter(Boolean)
    .join("  |  ");
  const showPayments = settings.show_payment_history && data.payments.length > 0;
  const showTopBar = settings.show_top_bar && s.supportsTopBar;
  const { totals } = data;
  const px = { xs: 2.5, sm: 5.5 };

  return (
    <Paper
      ref={ref}
      className="invoice-sheet"
      elevation={0}
      sx={{
        maxWidth: 840,
        mx: "auto",
        bgcolor: documentTokens.paper,
        color: s.ink,
        borderRadius: s.cardRadius,
        border: "1px solid var(--slate-200)",
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05)",
        overflow: "hidden",
      }}
    >
      {showTopBar && <Box sx={{ height: 12, bgcolor: s.primary }} />}

      {/* Header */}
      <Box sx={{ px, pt: 5, pb: s.headerBand ? 4 : 0, bgcolor: s.headerBand ?? "transparent" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Logo logoUrl={logoUrl} name={settings.business_name} height={s.logoHeight} />
            {settings.tagline && (
              <Typography sx={{ mt: 0.75, fontSize: "0.78rem", color: s.muted, letterSpacing: "0.01em" }}>
                {settings.tagline}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{
                fontSize: s.title.size,
                fontWeight: s.title.weight,
                lineHeight: 1,
                letterSpacing: s.title.letterSpacing,
                color: s.title.color,
              }}
            >
              {data.label}
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: s.muted, mt: 0.75 }}>No. {data.number}</Typography>
          </Box>
        </Box>
        {data.notice && (
          <Typography sx={{ mt: 2, fontSize: "0.8rem", fontWeight: 700, color: s.primary, textAlign: "right" }}>
            {data.notice}
          </Typography>
        )}
      </Box>

      <Box sx={{ px, pt: 0, pb: 4 }}>
        {/* Dates */}
        {data.dates.length > 0 && (
          <Box
            sx={{
              mt: s.headerBand ? 3 : s.sectionGap + 1,
              py: 2,
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: `repeat(${Math.min(data.dates.length, 3)}, 1fr)` },
              gap: 2,
              borderTop: s.headerBand ? "none" : `1px solid ${s.hairline}`,
              borderBottom: `1px solid ${s.hairline}`,
            }}
          >
            {data.dates.map((d) => (
              <Box key={d.label}>
                <Label s={s}>{d.label}</Label>
                <Typography sx={{ fontSize: "0.95rem", mt: 0.5 }}>{d.value}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Parties */}
        <Box sx={{ mt: s.sectionGap, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
          <Box>
            <Label s={s}>{data.billedToLabel}</Label>
            <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 0.75 }}>{data.billedTo.name}</Typography>
            {data.billedTo.lines.map((l, i) => (
              <Typography key={i} sx={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
                {l}
              </Typography>
            ))}
          </Box>
          <Box>
            <Label s={s}>From</Label>
            <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 0.75 }}>{settings.business_name}</Typography>
            {fromLines.map((l, i) => (
              <Typography key={i} sx={{ fontSize: "0.88rem", lineHeight: 1.7 }}>
                {l}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Items */}
        <Box sx={{ mt: s.sectionGap }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: COLS,
              gap: 1,
              alignItems: "center",
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
            <span>#</span>
            <span>Description</span>
            <span style={{ textAlign: "right" }}>Qty</span>
            <span style={{ textAlign: "right" }}>Rate</span>
            <span style={{ textAlign: "right" }}>Amount</span>
          </Box>

          {data.lines.map((line, i) => (
            <Box
              key={i}
              className="invoice-row"
              sx={{
                display: "grid",
                gridTemplateColumns: COLS,
                gap: 1,
                alignItems: "start",
                px: 2,
                py: s.rowPy,
                bgcolor: s.zebra && i % 2 === 1 ? s.zebra : "transparent",
                borderBottom: `1px solid ${s.hairline}`,
                fontSize: "0.92rem",
              }}
            >
              <span style={{ color: s.muted }}>{i + 1}</span>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", overflowWrap: "anywhere" }}>
                  {line.description}
                </Typography>
                {line.detail && (
                  <Typography sx={{ fontSize: "0.74rem", color: s.muted, mt: 0.25 }}>{line.detail}</Typography>
                )}
              </Box>
              <span style={{ textAlign: "right" }}>{line.qty}</span>
              <span style={{ textAlign: "right" }}>{line.rate}</span>
              <span style={{ textAlign: "right", fontWeight: 700 }}>{line.amount}</span>
            </Box>
          ))}
        </Box>

        {/* Terms + totals */}
        <Box
          sx={{
            mt: 2.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Box>
            {data.terms && (
              <>
                <Label s={s}>Terms</Label>
                <Typography sx={{ fontSize: "0.88rem", mt: 0.75, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {data.terms}
                </Typography>
              </>
            )}
          </Box>

          <Box className="invoice-row">
            <TotalRow s={s} label="Subtotal" value={totals.subtotal} />
            {totals.discount && <TotalRow s={s} label="Discount" value={`− ${totals.discount}`} />}
            <TotalRow s={s} label={settings.tax_label} value={settings.tax_note} />
            {totals.total && (
              <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${s.hairline}` }}>
                <TotalRow s={s} label="Total" value={totals.total} strong />
                {totals.paid && <TotalRow s={s} label="Amount paid" value={totals.paid} />}
              </Box>
            )}
            <Box
              sx={{
                mt: 1.5,
                // Flat bars (no fill, no outline) line up with the rows above
                // instead of being indented like a filled one.
                px: s.totalBar.bg === "transparent" && s.totalBar.border === "none" ? 0.5 : 2,
                py: 1.4,
                borderRadius: s.totalBar.radius,
                bgcolor: s.totalBar.bg,
                color: s.totalBar.color,
                border: s.totalBar.border,
                borderTop: s.totalBar.rule ? `1px solid ${s.hairline}` : undefined,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                {totals.finalLabel}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: s.totalBar.size }}>{totals.finalAmount}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Payment history */}
        {showPayments && (
          <Box sx={{ mt: s.sectionGap + 1 }} className="invoice-row">
            <Label s={s}>Payment history</Label>
            <Box sx={{ mt: 1, borderTop: `1px solid ${s.hairline}` }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                  gap: 1,
                  py: 1.1,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: s.label,
                  borderBottom: `1px solid ${s.hairline}`,
                }}
              >
                <span>Date</span>
                <span>Method</span>
                <span>Transaction ID</span>
                <span style={{ textAlign: "right" }}>Amount paid</span>
              </Box>
              {data.payments.map((p, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                    gap: 1,
                    py: 1.1,
                    fontSize: "0.88rem",
                    borderBottom: `1px solid ${s.hairline}`,
                  }}
                >
                  <span>{p.date}</span>
                  <span>{p.method}</span>
                  <span style={{ overflowWrap: "anywhere" }}>{p.reference}</span>
                  <span style={{ textAlign: "right" }}>{p.amount}</span>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ mt: s.sectionGap + 2, pt: 2.5, borderTop: `1px solid ${s.hairline}`, textAlign: "center" }}>
          {settings.footer_message && (
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: s.primary }}>
              {settings.footer_message}
            </Typography>
          )}
          {footerContact && (
            <Typography sx={{ fontSize: "0.78rem", color: s.muted, mt: 0.5 }}>{footerContact}</Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
});

function TotalRow({
  s,
  label,
  value,
  strong = false,
}: {
  s: DocumentStyle;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.5, px: 0.5 }}>
      <Typography sx={{ fontSize: "0.92rem", fontWeight: strong ? 700 : 400, color: strong ? s.ink : s.muted }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.92rem", fontWeight: strong ? 700 : 400, textAlign: "right" }}>{value}</Typography>
    </Box>
  );
}

export default DocumentSheet;
