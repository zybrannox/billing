import { apiService } from "../api/service";

// Must match CHUNK_SIZE in app/project_files/chunked.py - the server writes
// each chunk back to `chunk_index * CHUNK_SIZE`, so both sides have to
// agree on this without it being sent over the wire.
const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

// Files at or below this go through the plain single-request /files/upload
// instead - safely under Cloudflare's ~100MB proxy body limit, so there's
// no reason to pay chunking's overhead (an init + complete round trip, N
// separate requests) for the common case of ordinary-sized attachments.
export const CHUNK_UPLOAD_THRESHOLD = 60 * 1024 * 1024; // 60MB

// A failed chunk is retried this many times, waiting a little longer each time
// (1s, 2s, 4s, 8s, 16s): a 1GB file is 50+ requests, and one dropped connection
// or brief server restart shouldn't throw away everything already uploaded.
const MAX_ATTEMPTS = 6;
const RETRY_BASE_DELAY_MS = 1000;

// How many chunks upload in parallel. High enough to use more of the
// connection than one chunk at a time would, low enough not to overwhelm
// the backend's thread pool (each in-flight chunk occupies one of its
// worker threads for the duration of its write - see chunked.py) if
// several large files are uploading at once.
const CHUNK_CONCURRENCY = 3;

interface InitResponse {
  upload_id: string;
}

interface CompleteResponse {
  path: string;
  original_name: string;
  width: number | null;
  height: number | null;
  pixel_width: number | null;
  pixel_height: number | null;
}

type RequestFailure = { code?: string; name?: string; response?: { status?: number } };

const isCancelled = (err: RequestFailure) => err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

const isTransient = (err: RequestFailure) => {
  if (isCancelled(err)) return false;
  const status = err?.response?.status;
  // No response at all means the connection dropped or the transfer stalled.
  return status === undefined || status === 408 || status === 429 || status >= 500;
};

const waitFor = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });

async function withRetries<T>(signal: AbortSignal, attempt: () => Promise<T>): Promise<T> {
  for (let tries = 1; ; tries++) {
    try {
      return await attempt();
    } catch (err) {
      if (tries >= MAX_ATTEMPTS || signal.aborted || !isTransient(err as RequestFailure)) throw err;
      await waitFor(RETRY_BASE_DELAY_MS * 2 ** (tries - 1), signal);
      if (signal.aborted) throw err;
    }
  }
}

/**
 * Uploads a large file in fixed-size chunks instead of one request, so it
 * never hits Cloudflare's proxy body-size cap regardless of the file's
 * total size. See app/project_files/chunked.py for the server side and the
 * reasoning behind why this exists at all.
 */
export async function uploadFileChunked(
  file: File,
  metadata: { width: number | null; height: number | null; pixelWidth: number | null; pixelHeight: number | null },
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<CompleteResponse> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const { upload_id } = await withRetries(signal, () =>
    apiService.post<InitResponse>("/files/upload/init", {
      filename: file.name,
      total_size: file.size,
      total_chunks: totalChunks,
    }),
  );

  // Once a chunk has failed for good there's no point sending the rest of the
  // file: this stops the other workers and their in-flight requests.
  const stopAll = new AbortController();
  const forwardAbort = () => stopAll.abort();
  signal.addEventListener("abort", forwardAbort, { once: true });
  if (signal.aborted) stopAll.abort();

  // Bytes "loaded" per chunk (approximated from that chunk's own upload
  // percent - postWithProgress only reports percent, not raw bytes - close
  // enough for a progress bar, which doesn't need byte-perfect accuracy).
  const loadedByChunk = new Array<number>(totalChunks).fill(0);
  const reportProgress = () => {
    const loaded = loadedByChunk.reduce((sum, n) => sum + n, 0);
    onProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
  };

  const uploadChunk = async (chunkIndex: number) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkSize = end - start;
    const blob = file.slice(start, end);

    const form = new FormData();
    form.append("upload_id", upload_id);
    form.append("chunk_index", String(chunkIndex));
    form.append("chunk", blob);

    await withRetries(stopAll.signal, () => {
      loadedByChunk[chunkIndex] = 0;
      return apiService.postWithProgress(
        "/files/upload/chunk",
        form,
        (percent) => {
          loadedByChunk[chunkIndex] = (percent / 100) * chunkSize;
          reportProgress();
        },
        stopAll.signal,
      );
    });
    loadedByChunk[chunkIndex] = chunkSize;
    reportProgress();
  };

  // Bounded-concurrency worker pool: each worker keeps pulling the next
  // unclaimed chunk index until none remain, so at most CHUNK_CONCURRENCY
  // requests are in flight regardless of how many chunks there are.
  let nextChunk = 0;
  const workerCount = Math.min(CHUNK_CONCURRENCY, totalChunks);
  // The first failure is the one worth reporting - later ones are just the
  // other workers being cancelled because of it.
  let firstFailure: { error: unknown } | null = null;
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextChunk < totalChunks && !firstFailure) {
      const index = nextChunk++;
      try {
        await uploadChunk(index);
      } catch (error) {
        firstFailure ??= { error };
        stopAll.abort();
      }
    }
  });
  await Promise.all(workers);
  signal.removeEventListener("abort", forwardAbort);
  if (firstFailure) throw (firstFailure as { error: unknown }).error;

  // Safe to repeat: the server answers a repeated complete with the same file.
  return withRetries(signal, () =>
    apiService.post<CompleteResponse>("/files/upload/complete", {
      upload_id,
      filename: file.name,
      width: metadata.width,
      height: metadata.height,
      pixel_width: metadata.pixelWidth,
      pixel_height: metadata.pixelHeight,
    }),
  );
}
