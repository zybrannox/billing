import { useMemo, useRef, useState, type ReactNode } from "react";
import { Box, CircularProgress, Snackbar, Typography, useMediaQuery } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import Button from "../../ui/Button";
import { GenericDialog } from "../../ui/Dialog";
import Panel from "../../ui/Panel";
import SaveBar from "../../ui/SaveBar";
import { SettingRow, SwitchRow } from "../../ui/SettingRow";
import TextField from "../../ui/TextField";
import DocumentSheet from "../documents/DocumentSheet";
import { sampleInvoiceDocument } from "../billing/documentAdapters";
import { TEMPLATES, resolveDocumentStyle } from "../documents/documentTemplates";
import type { DocumentSettings } from "../documents/documentSettings";
import {
  CUSTOM_THEME_KEY,
  THEME_PRESETS,
  isHexColor,
  resolveDocumentTheme,
} from "../documents/documentTheme";
import { useDocumentSettings, useDocumentSettingsStore } from "../documents/useDocumentSettingsStore";
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

// A titled group of settings in the shared panel style.
function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Panel title={title} description={hint}>
      <Box>{children}</Box>
    </Panel>
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
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 1.5 }}>
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
            <Box sx={{ height: 140, overflow: "hidden", borderRadius: 1, bgcolor: "var(--slate-100)", position: "relative" }}>
              <Box sx={{ zoom: 0.19, pointerEvents: "none", width: 840, mx: "auto" }}>
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

  // Beside the form on a wide screen; on a narrower one it sits above the
  // form (and can be folded away) so it is never lost below the fold.
  const sideBySide = useMediaQuery((theme: Theme) => theme.breakpoints.up("xl"));
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewBox = (
    <Box sx={{ overflow: "hidden", borderRadius: "14px", border: "1px solid var(--slate-200)", bgcolor: "var(--slate-100)", p: 1.5 }}>
      <Box sx={{ zoom: sideBySide ? 0.5 : 0.75, pointerEvents: "none" }}>
        <DocumentSheet data={previewData} settings={preview} logoUrl={logoUrl} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 460px" }, gap: 2, alignItems: "start" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        {!sideBySide && (
          <Panel
            title="Live preview"
            description="See how an invoice looks with your current choices."
            action={<Button variantColor="outline" size="small" onClick={() => setPreviewOpen(true)}>Open preview</Button>}
          >
            <GenericDialog open={previewOpen} onClose={() => setPreviewOpen(false)} title="Invoice preview" maxWidth="md">
              {previewBox}
            </GenericDialog>
          </Panel>
        )}
        <Card title="Branding" hint="Shown at the top of every invoice and quotation.">
          <SettingRow
            label="Logo"
            description="PNG, JPEG or WebP, up to 2 MB. A wide logo on a transparent background looks best. Applies immediately."
            align="start"
          >
            <LogoField />
          </SettingRow>
          <SettingRow label="Business name">
            <TextField value={draft.business_name} onChange={text("business_name")} />
          </SettingRow>
          <SettingRow label="Slogan" description="Small text under the logo. Leave empty to hide it.">
            <TextField placeholder="e.g. Printing & Signage Services" value={draft.tagline ?? ""} onChange={text("tagline")} />
          </SettingRow>
        </Card>

        <Card title="Business details" hint="Printed in the “From” block and the footer. Leave a field empty to hide it.">
          <SettingRow label="Address" align="start">
            <TextField multiline rows={2} value={draft.address ?? ""} onChange={text("address")} />
          </SettingRow>
          <SettingRow label="Phone">
            <TextField value={draft.phone ?? ""} onChange={text("phone")} />
          </SettingRow>
          <SettingRow label="Email">
            <TextField value={draft.email ?? ""} onChange={text("email")} />
          </SettingRow>
          <SettingRow label="Website">
            <TextField value={draft.website ?? ""} onChange={text("website")} />
          </SettingRow>
          <SettingRow label="GSTIN / Tax ID">
            <TextField value={draft.tax_id ?? ""} onChange={text("tax_id")} />
          </SettingRow>
        </Card>

        <Card title="Template" hint="The overall look of the document. Pick it by how it looks; colour is chosen separately.">
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
          <SettingRow label="Tax line label" description="The heading of the tax line in the totals.">
            <TextField value={draft.tax_label} onChange={text("tax_label")} />
          </SettingRow>
          <SettingRow label="Tax line text">
            <TextField value={draft.tax_note} onChange={text("tax_note")} />
          </SettingRow>
          <SettingRow label="Invoice terms" align="start">
            <TextField multiline rows={2} placeholder="e.g. Delivery on receipt of payment." value={draft.invoice_terms ?? ""} onChange={text("invoice_terms")} />
          </SettingRow>
          <SettingRow label="Quotation terms" align="start">
            <TextField multiline rows={2} value={draft.quotation_terms ?? ""} onChange={text("quotation_terms")} />
          </SettingRow>
          <SettingRow label="Footer message">
            <TextField value={draft.footer_message} onChange={text("footer_message")} />
          </SettingRow>
        </Card>

        <Card title="Layout">
          <SwitchRow
            label="Colour bar across the top"
            description={
              resolveDocumentStyle(draft).supportsTopBar
                ? "A thin strip in the accent colour above the header."
                : "Not used by the Minimal template."
            }
            checked={draft.show_top_bar}
            onChange={(v) => set("show_top_bar", v)}
            disabled={!resolveDocumentStyle(draft).supportsTopBar}
          />
          <SwitchRow
            label="Payment history on invoices"
            description="A table of each payment received, when there are any."
            checked={draft.show_payment_history}
            onChange={(v) => set("show_payment_history", v)}
          />
        </Card>

        <SaveBar
          visible={changed.length > 0}
          saving={saving}
          disabled={customInvalid}
          error={error}
          message={customInvalid ? "Enter a valid hex colour to save" : "You have unsaved changes"}
          onSave={save}
          onDiscard={() => setDraft({ ...saved })}
        />
        <Snackbar
          open={justSaved && changed.length === 0}
          autoHideDuration={3500}
          onClose={() => setJustSaved(false)}
          message="Saved - applies to all documents"
        />
      </Box>

      {/* Live preview: the real renderer on sample data, scaled to fit. */}
      {sideBySide && (
        <Box sx={{ position: "sticky", top: 16 }}>
          <Typography sx={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--slate-500)", mb: 1 }}>Live preview</Typography>
          {previewBox}
        </Box>
      )}
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
