import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiService } from "../api/service";
import { TransferStalledError } from "../api/transfer";
import { uploadFileChunked } from "./chunkedUpload";

vi.mock("../api/service", () => ({
  apiService: { post: vi.fn(), postWithProgress: vi.fn() },
}));

const post = vi.mocked(apiService.post);
const postChunk = vi.mocked(apiService.postWithProgress);

const CHUNK = 20 * 1024 * 1024;
const noDims = { width: null, height: null, pixelWidth: null, pixelHeight: null };

// Only `size` and `slice` are touched - no need to really allocate gigabytes.
const fileOf = (size: number) =>
  ({ name: "big.psd", size, slice: () => new Blob(["x"]) }) as unknown as File;

const httpError = (status: number) => Object.assign(new Error("http"), { response: { status } });
const networkError = () => new Error("Network Error");

const upload = (size: number, signal = new AbortController().signal, onProgress = vi.fn()) =>
  uploadFileChunked(fileOf(size), noDims, onProgress, signal);

// Runs an upload to completion with the retry back-off's timers fast-forwarded.
async function settle<T>(promise: Promise<T>) {
  const settled = promise.then(
    (value) => ({ value, error: undefined as unknown }),
    (error) => ({ value: undefined, error }),
  );
  await vi.runAllTimersAsync();
  return settled;
}

describe("uploadFileChunked", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    post.mockReset();
    postChunk.mockReset();
    post.mockImplementation(async (url: string) =>
      url.endsWith("/init") ? { upload_id: "u1" } : { path: "stored.psd" },
    );
    postChunk.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends every chunk once and then completes", async () => {
    const { value, error } = await settle(upload(CHUNK * 2 + 1));
    expect(error).toBeUndefined();
    expect(value).toEqual({ path: "stored.psd" });
    expect(postChunk).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenLastCalledWith("/files/upload/complete", expect.objectContaining({ upload_id: "u1" }));
  });

  it("retries a chunk after a dropped connection, a stall or a server error", async () => {
    postChunk
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(new TransferStalledError())
      .mockRejectedValueOnce(httpError(502));
    const { error } = await settle(upload(CHUNK));
    expect(error).toBeUndefined();
    expect(postChunk).toHaveBeenCalledTimes(4);
    expect(post).toHaveBeenCalledWith("/files/upload/complete", expect.anything());
  });

  it("gives up after repeated failures without completing", async () => {
    postChunk.mockRejectedValue(httpError(503));
    const { error } = await settle(upload(CHUNK));
    expect(error).toMatchObject({ response: { status: 503 } });
    expect(post).not.toHaveBeenCalledWith("/files/upload/complete", expect.anything());
  });

  it("does not retry a request the server rejected outright", async () => {
    postChunk.mockRejectedValue(httpError(400));
    const { error } = await settle(upload(CHUNK));
    expect(error).toMatchObject({ response: { status: 400 } });
    expect(postChunk).toHaveBeenCalledTimes(1);
  });

  it("stops sending the rest of the file once a chunk has definitively failed", async () => {
    postChunk.mockRejectedValue(httpError(400));
    await settle(upload(CHUNK * 10));
    // Only what was already in flight when the first one failed.
    expect(postChunk.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("reports the real failure, not the cancellation of the other chunks", async () => {
    postChunk.mockImplementation(async (_url, _data, _progress, signal) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (signal?.aborted) throw Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
      throw httpError(400);
    });
    const { error } = await settle(upload(CHUNK * 3));
    expect(error).toMatchObject({ response: { status: 400 } });
  });

  it("does not retry after the user cancels", async () => {
    const controller = new AbortController();
    postChunk.mockImplementation(async () => {
      controller.abort();
      throw Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
    });
    const { error } = await settle(upload(CHUNK, controller.signal));
    expect(error).toMatchObject({ code: "ERR_CANCELED" });
    expect(postChunk).toHaveBeenCalledTimes(1);
  });

  it("retries a complete call whose response was lost", async () => {
    let completes = 0;
    post.mockImplementation(async (url: string) => {
      if (url.endsWith("/init")) return { upload_id: "u1" };
      if (completes++ === 0) throw networkError();
      return { path: "stored.psd" };
    });
    const { value, error } = await settle(upload(CHUNK));
    expect(error).toBeUndefined();
    expect(value).toEqual({ path: "stored.psd" });
  });
});
