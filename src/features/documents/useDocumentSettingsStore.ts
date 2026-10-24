import { useEffect } from "react";
import { create } from "zustand";
import { apiService } from "../../api/service";
import {
  DEFAULT_DOCUMENT_SETTINGS,
  type DocumentSettings,
} from "./documentSettings";

const BASE = "/document-settings";

export type DocumentSettingsPatch = Partial<
  Omit<DocumentSettings, "has_logo">
>;

interface DocumentSettingsState {
  settings: DocumentSettings;
  // The uploaded logo as a data URL, or null for the built-in one. Fetched
  // through the authenticated API and inlined rather than pointed at by
  // URL: html2canvas (PDF export / WhatsApp share) can't reliably draw a
  // cross-origin image, but always can a data URL.
  logoUrl: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: DocumentSettingsPatch) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const fetchLogo = async (settings: DocumentSettings) => {
  if (!settings.has_logo) return null;
  try {
    const blob = await apiService.get<Blob>(`${BASE}/logo`, { responseType: "blob" });
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
};

let inflight: Promise<void> | null = null;

export const useDocumentSettingsStore = create<DocumentSettingsState>((set, get) => ({
  settings: DEFAULT_DOCUMENT_SETTINGS,
  logoUrl: null,
  loaded: false,

  // Safe to call from every document that renders - one request, shared.
  // Failure leaves the defaults in place: a document must still render.
  load: () => {
    if (get().loaded) return Promise.resolve();
    if (!inflight) {
      inflight = (async () => {
        try {
          const settings = await apiService.get<DocumentSettings>(`${BASE}/`);
          set({ settings, logoUrl: await fetchLogo(settings), loaded: true });
        } catch {
          // keep defaults; the next mount retries
        } finally {
          inflight = null;
        }
      })();
    }
    return inflight;
  },

  update: async (patch) => {
    const settings = await apiService.put<DocumentSettings>(`${BASE}/`, patch);
    set({ settings });
  },

  uploadLogo: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const settings = await apiService.post<DocumentSettings>(`${BASE}/logo`, form);
    set({ settings, logoUrl: await fetchLogo(settings) });
  },

  removeLogo: async () => {
    const settings = await apiService.delete<DocumentSettings>(`${BASE}/logo`);
    set({ settings, logoUrl: null });
  },
}));

// What a document component calls: the settings (defaults until loaded) and
// the logo, triggering the one shared load on first use.
export function useDocumentSettings() {
  const settings = useDocumentSettingsStore((s) => s.settings);
  const logoUrl = useDocumentSettingsStore((s) => s.logoUrl);
  const load = useDocumentSettingsStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return { settings, logoUrl };
}
