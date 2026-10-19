import { useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Box, CircularProgress, Switch, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import Button from "../../ui/Button";
import TextField from "../../ui/TextField";
import DocumentSheet from "../../documents/DocumentSheet";
import { sampleInvoiceDocument } from "../../documents/documentAdapters";
import { TEMPLATES, resolveDocumentStyle } from "../../documents/documentTemplates";
import type { DocumentSettings } from "../../documents/documentSettings";
import {
  CUSTOM_THEME_KEY,
  THEME_PRESETS,
  isHexColor,
  resolveDocumentTheme,
} from "../../documents/documentTheme";
import { useDocumentSettings, useDocumentSettingsStore } from "../../store/useDocumentSettingsStore";
import { documentTokens } from "../../theme/tokens";
import { getApiErrorMessage } from "../../utils/apiError";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const EDITABLE_KEYS = [
  "business_name",
  "tagline",
  "address",
  "phone",
  "email",
  "website",
  "tax_id",
  "template",
  "theme",
  "custom_color",
  "show_top_bar",
  "show_payment_history",
  "tax_label",
  "tax_note",
  "invoice_terms",
  "quotation_terms",
  "footer_message",
] as const;

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ bgcolor: "var(--white)", border: "1px solid var(--slate-200)", borderRadius: 3, p: 2.5 }}>
      <Typography sx={{ fontWeight: 700, color: "var(--slate-800)" }}>{title}</Typography>
      {hint && (
        <Typography variant="body2" sx={{ color: "var(--slate-500)", mt: 0.25 }}>
          {hint}
        </Typography>
      )}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>{children}</Box>
    </Box>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: "var(--fs-md)", fontWeight: 600, color: "var(--slate-700)" }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: "var(--slate-500)" }}>
          {hint}
        </Typography>
      </Box>
      <Switch checked={checked} disabled={disabled} onChange={(_, v) => onChange(v)} />
    </Box>
  );
}

function LogoField() {
  const { settings, logoUrl } = useDocumentSettings();
  const uploadLogo = useDocumentSettingsStore((s) => s.uploadLogo);
  const removeLogo = useDocumentSettingsStore((s) => s.removeLogo);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }
    void run(() => uploadLogo(file), "Couldn't upload the logo.");
  };

  return (
    <Box>
      <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 500, color: "var(--slate-700)", mb: 0.75 }}>Logo</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box
          sx={{
            height: 64,
            minWidth: 160,
            px: 2,
            display: "flex",
            alignItems: "center",
            border: "1px dashed var(--slate-300)",
            borderRadius: 2,
            bgcolor: "var(--slate-50)",
          }}
        >
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="Logo" sx={{ maxHeight: 44, maxWidth: 200, objectFit: "contain" }} />
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="img" src="/images/logo.webp" alt="" sx={{ height: 30 }} />
              <Box component="img" src="/images/logo_text.webp" alt="Zybrannox" sx={{ height: 20 }} />
            </Box>
          )}
        </Box>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variantColor="outline" size="small" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Working…" : settings.has_logo ? "Replace logo" : "Upload logo"}
        </Button>
        {settings.has_logo && (
          <Button
            variantColor="transparent"
            size="small"
            disabled={busy}
            onClick={() => void run(removeLogo, "Couldn't remove the logo.")}
          >
            Use default
          </Button>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: "var(--slate-500)", display: "block", mt: 0.75 }}>
        PNG, JPEG or WebP, up to 2 MB. A wide logo with a transparent background looks best. Changes to the logo apply
        immediately.
      </Typography>
      {error && (
        <Typography variant="caption" sx={{ color: "var(--red-600)", display: "block", mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

// One card per template, each a real (tiny) render of the sample document in
// that template - so the choice is made by looking, not by reading a name.
function TemplatePicker({
  value,
  settings,
  onChange,
}: {
  value: string;
  settings: DocumentSettings;
  onChange: (key: string) => void;
}) {
  const { logoUrl } = useDocumentSettings();
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)", lg: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 1.5 }}>
      {TEMPLATES.map((t) => {
        const selected = value === t.key;
        const candidate = { ...settings, template: t.key };
        return (
          <Box
            key={t.key}
            component="button"
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(t.key)}
            sx={{
              textAlign: "left",
              p: 1,
              borderRadius: 2,
              cursor: "pointer",
              bgcolor: "var(--white)",
              border: selected ? "2px solid var(--blue-600)" : "1px solid var(--slate-200)",
              boxShadow: selected ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
              "&:hover": { borderColor: "var(--blue-400)" },
            }}
          >
            <Box sx={{ height: 150, overflow: "hidden", borderRadius: 1, bgcolor: "var(--slate-100)", position: "relative" }}>
              <Box sx={{ zoom: 0.2, pointerEvents: "none", width: 840, mx: "auto" }}>
                <DocumentSheet data={sampleInvoiceDocument(candidate)} settings={candidate} logoUrl={logoUrl} />
              </Box>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "var(--fs-md)", color: "var(--slate-800)", mt: 1 }}>
              {t.label}
            </Typography>
            <Typography sx={{ fontSize: "var(--fs-2xs)", color: "var(--slate-500)", lineHeight: 1.35 }}>
              {t.description}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function ThemePicker({
  theme,
  customColor,
  onChange,
}: {
  theme: string;
  customColor: string | null;
  onChange: (theme: string, customColor: string | null) => void;
}) {
  const custom = isHexColor(customColor) ? customColor : documentTokens.accents.indigo;
  const swatch = (key: string, color: string, label: string, preview?: ReactNode) => {
    const selected = theme === key;
    return (
      <Box
        key={key}
        component="button"
        type="button"
        aria-label={label}
        aria-pressed={selected}
        title={label}
        onClick={() => onChange(key, key === CUSTOM_THEME_KEY ? custom : customColor)}
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: color,
          color: resolveDocumentTheme({ theme: key, custom_color: color }).onPrimary,
          border: selected ? "3px solid var(--white)" : "3px solid transparent",
          outline: selected ? `2px solid ${color}` : "1px solid var(--slate-200)",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          p: 0,
        }}
      >
        {selected ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : preview}
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        {THEME_PRESETS.map((p) => swatch(p.key, p.color, p.label))}
        {swatch(CUSTOM_THEME_KEY, custom, "Custom colour")}
      </Box>
      {theme === CUSTOM_THEME_KEY && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
          <input
            type="color"
            aria-label="Pick a custom colour"
            value={custom}
            onChange={(e) => onChange(CUSTOM_THEME_KEY, e.target.value)}
            style={{ width: 44, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }}
          />
          <Box sx={{ width: 120 }}>
            <TextField
              value={custom}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(CUSTOM_THEME_KEY, v);
              }}
              placeholder={documentTokens.accents.indigo}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

// Mounted only once the saved settings have loaded, so `draft` can start
// from them directly (no sync effect) and every edit is a plain local
// change until Save.
function DesignEditor({ initial }: { initial: DocumentSettings }) {
  const update = useDocumentSettingsStore((s) => s.update);
  const { logoUrl, settings: saved } = useDocumentSettings();
  const [draft, setDraft] = useState<DocumentSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // has_logo changes via the (immediate) logo controls, not the draft.
  const preview = useMemo<DocumentSettings>(
    () => ({ ...draft, has_logo: saved.has_logo }),
    [draft, saved.has_logo],
  );
  const previewData = useMemo(() => sampleInvoiceDocument(preview), [preview]);

  const set = <K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) => {
    setJustSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const text = (key: keyof DocumentSettings) => (e: { target: { value: string } }) =>
    set(key, e.target.value as never);

  const changed = EDITABLE_KEYS.filter((k) => draft[k] !== saved[k]);
  const customInvalid = draft.theme === CUSTOM_THEME_KEY && !isHexColor(draft.custom_color);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await update(Object.fromEntries(changed.map((k) => [k, draft[k]])));
      setJustSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save your changes."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 500px" }, gap: 3, alignItems: "start" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Card title="Branding" hint="Shown at the top of every invoice and quotation.">
          <LogoField />
          <TextField label="Business name" value={draft.business_name} onChange={text("business_name")} />
          <TextField
            label="Slogan"
            placeholder="e.g. Printing & Signage Services"
            helperText="Shown in small text under the logo. Leave empty to hide it."
            value={draft.tagline ?? ""}
            onChange={text("tagline")}
          />
        </Card>

        <Card title="Business details" hint="Printed in the “From” block and the footer. Leave a field empty to hide it.">
          <TextField label="Address" multiline rows={3} value={draft.address ?? ""} onChange={text("address")} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.75 }}>
            <TextField label="Phone" value={draft.phone ?? ""} onChange={text("phone")} />
            <TextField label="Email" value={draft.email ?? ""} onChange={text("email")} />
            <TextField label="Website" value={draft.website ?? ""} onChange={text("website")} />
            <TextField label="GSTIN / Tax ID" value={draft.tax_id ?? ""} onChange={text("tax_id")} />
          </Box>
        </Card>

        <Card title="Template" hint="The overall look of the document. Pick it by how it looks; colour is chosen separately below.">
          <TemplatePicker value={draft.template} settings={preview} onChange={(key) => set("template", key)} />
        </Card>

        <Card title="Accent colour" hint="Used for the title, table header and totals - exactly where depends on the template.">
          <ThemePicker
            theme={draft.theme}
            customColor={draft.custom_color}
            onChange={(theme, color) => {
              setJustSaved(false);
              setDraft((d) => ({ ...d, theme, custom_color: color }));
            }}
          />
        </Card>

        <Card title="Wording">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.75 }}>
            <TextField label="Tax line label" value={draft.tax_label} onChange={text("tax_label")} />
            <TextField label="Tax line text" value={draft.tax_note} onChange={text("tax_note")} />
          </Box>
          <TextField
            label="Invoice terms"
            multiline
            rows={2}
            placeholder="e.g. Delivery on receipt of payment."
            value={draft.invoice_terms ?? ""}
            onChange={text("invoice_terms")}
          />
          <TextField
            label="Quotation terms"
            multiline
            rows={2}
            value={draft.quotation_terms ?? ""}
            onChange={text("quotation_terms")}
          />
          <TextField label="Footer message" value={draft.footer_message} onChange={text("footer_message")} />
        </Card>

        <Card title="Layout">
          <ToggleRow
            label="Colour bar across the top"
            hint={
              resolveDocumentStyle(draft).supportsTopBar
                ? "A thin strip in the accent colour above the header."
                : "Not used by the Minimal template."
            }
            checked={draft.show_top_bar}
            onChange={(v) => set("show_top_bar", v)}
            disabled={!resolveDocumentStyle(draft).supportsTopBar}
          />
          <ToggleRow
            label="Payment history on invoices"
            hint="A table of each payment received, when there are any."
            checked={draft.show_payment_history}
            onChange={(v) => set("show_payment_history", v)}
          />
        </Card>

        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button onClick={save} disabled={saving || changed.length === 0 || customInvalid}>
            {saving ? <CircularProgress size={18} sx={{ color: "inherit" }} /> : "Save changes"}
          </Button>
          <Button
            variantColor="outline"
            disabled={saving || changed.length === 0}
            onClick={() => setDraft({ ...saved })}
          >
            Discard
          </Button>
          {justSaved && changed.length === 0 && (
            <Typography variant="body2" sx={{ color: "var(--emerald-600)", fontWeight: 600 }}>
              Saved — applies to all documents.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Live preview: the real renderer on sample data, scaled to fit. */}
      <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
        <Typography sx={{ fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.06em", color: "var(--slate-500)", mb: 1 }}>
          LIVE PREVIEW
        </Typography>
        <Box sx={{ overflow: "hidden", borderRadius: 3, border: "1px solid var(--slate-200)", bgcolor: "var(--slate-100)", p: 1.5 }}>
          <Box sx={{ zoom: 0.55, pointerEvents: "none" }}>
            <DocumentSheet data={previewData} settings={preview} logoUrl={logoUrl} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function DocumentDesignSettings() {
  const { settings } = useDocumentSettings();
  const loaded = useDocumentSettingsStore((s) => s.loaded);

  if (!loaded) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }
  return <DesignEditor initial={settings} />;
}
