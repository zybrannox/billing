import { TransferMessageError } from "../api/transfer";

// Above this, a download goes straight to the browser's download manager rather
// than through a Blob in page memory. Browsers cap how much blob data a page can
// hold, and past that cap a download fails instantly with a bare "network error"
// - reproducibly, a second 1GB file while the first is still held. It also
// depends on the machine's memory, so it only ever failed "sometimes".
export const LARGE_DOWNLOAD_BYTES = 100 * 1024 * 1024;

// Long enough for the browser to have picked up the largest blob we'd create.
const REVOKE_DELAY_MS = 2 * 60 * 1000;

const clickLink = (href: string, filename?: string) => {
  const link = document.createElement("a");
  link.href = href;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Hands a downloaded blob to the browser to save. The object URL has to outlive
 * the click: the browser starts the save asynchronously, and revoking the URL
 * straight away can make it silently save nothing at all - the progress bar
 * finishes, no error anywhere, and no file.
 */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  clickLink(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * Starts a download in the browser's own download manager: straight to disk, no
 * page memory involved, and with the browser's own progress and resume. The
 * server's Content-Disposition names the file.
 */
export function startBrowserDownload(url: string) {
  clickLink(url);
}

/**
 * Checks a download would succeed before handing it to the browser, whose only
 * way to show a failure is to navigate away from the app to the error response.
 * Reads only the headers, then drops the connection.
 */
export async function assertDownloadable(url: string) {
  const controller = new AbortController();
  const res = await fetch(url, { credentials: "include", signal: controller.signal });
  if (res.ok) {
    controller.abort();
    return;
  }
  const body = await res.json().catch(() => null);
  throw new TransferMessageError(typeof body?.detail === "string" ? body.detail : "The file isn't available.");
}
