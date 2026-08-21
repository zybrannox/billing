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
}

/**
 * Uploads a large file in fixed-size chunks instead of one request, so it
 * never hits Cloudflare's proxy body-size cap regardless of the file's
 * total size. See app/project_files/chunked.py for the server side and the
 * reasoning behind why this exists at all.
 */
export async function uploadFileChunked(
  file: File,
  metadata: { width: number | null; height: number | null },
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<CompleteResponse> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const { upload_id } = await apiService.post<InitResponse>("/files/upload/init", {
    filename: file.name,
    total_size: file.size,
    total_chunks: totalChunks,
  });

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

    await apiService.postWithProgress(
      "/files/upload/chunk",
      form,
      (percent) => {
        loadedByChunk[chunkIndex] = (percent / 100) * chunkSize;
        reportProgress();
      },
      signal,
    );
    loadedByChunk[chunkIndex] = chunkSize;
    reportProgress();
  };

  // Bounded-concurrency worker pool: each worker keeps pulling the next
  // unclaimed chunk index until none remain, so at most CHUNK_CONCURRENCY
  // requests are in flight regardless of how many chunks there are.
  let nextChunk = 0;
  const workerCount = Math.min(CHUNK_CONCURRENCY, totalChunks);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextChunk < totalChunks) {
      const index = nextChunk++;
      await uploadChunk(index);
    }
  });
  await Promise.all(workers);

  return apiService.post<CompleteResponse>("/files/upload/complete", {
    upload_id,
    filename: file.name,
    width: metadata.width,
    height: metadata.height,
  });
}
