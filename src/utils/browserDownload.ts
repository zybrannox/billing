import { apiService } from "../api/service";
import { TransferMessageError } from "../api/transfer";
import { startBrowserDownload } from "./fileDownload";

const POLL_INTERVAL_MS = 1000;
// How long the browser gets to make the request at all.
const START_TIMEOUT_MS = 30_000;
// A download whose byte count hasn't moved for this long is no longer being
// watched, though it may yet finish in the browser.
const STALL_TIMEOUT_MS = 10 * 60 * 1000;
// A brief network problem between polls isn't a failed download.
const MAX_POLL_FAILURES = 30;

export interface BrowserDownloadProgress {
  percent: number | null;
  loaded: number;
  total: number | null;
}

interface ServerProgress {
  state: "preparing" | "sending" | "done" | "stopped";
  sent: number;
  total: number | null;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(16, "0");

/**
 * Downloads through the browser's own download manager (straight to disk) while
 * reporting how far it has got, by asking the server how much it has sent. Resolves
 * once the whole file has gone out, by which time the server has marked it
 * downloaded; rejects with a message for the user if it didn't get there.
 */
export async function runBrowserDownload(
  url: string,
  onProgress: (progress: BrowserDownloadProgress) => void,
): Promise<void> {
  const id = newId();
  startBrowserDownload(`${url}?direct=1&progress_id=${id}`);

  const startedAt = Date.now();
  let started = false;
  let lastSent = -1;
  let lastMovedAt = Date.now();
  let failures = 0;

  for (;;) {
    await wait(POLL_INTERVAL_MS);

    let progress: ServerProgress;
    try {
      progress = await apiService.get<ServerProgress>(`/files/download/progress/${id}`);
      failures = 0;
    } catch (err) {
      const notThereYet = (err as { response?: { status?: number } })?.response?.status === 404;
      if (notThereYet && !started) {
        if (Date.now() - startedAt > START_TIMEOUT_MS) {
          throw new TransferMessageError(
            "The download didn't start. Check that your browser allows downloads from this site, then try again.",
          );
        }
        continue;
      }
      if (++failures >= MAX_POLL_FAILURES) {
        throw new TransferMessageError("Couldn't check the download's progress. Please check your browser's downloads.");
      }
      continue;
    }

    started = true;
    if (progress.state === "done") return;
    if (progress.state === "stopped") {
      throw new TransferMessageError("The download stopped before finishing. If you didn't cancel it, please try again.");
    }

    onProgress({
      // Held at 99 until the server says done, like the app's other transfers.
      percent: progress.total ? Math.min(99, Math.round((progress.sent / progress.total) * 100)) : null,
      loaded: progress.sent,
      total: progress.total,
    });

    if (progress.sent !== lastSent) {
      lastSent = progress.sent;
      lastMovedAt = Date.now();
    } else if (Date.now() - lastMovedAt > STALL_TIMEOUT_MS) {
      throw new TransferMessageError("This download has stopped moving. Please check your browser's downloads.");
    }
  }
}
