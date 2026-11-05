import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiService } from "../api/service";
import { runBrowserDownload } from "./browserDownload";
import { startBrowserDownload } from "./fileDownload";

vi.mock("../api/service", () => ({ apiService: { get: vi.fn() } }));
vi.mock("./fileDownload", () => ({ startBrowserDownload: vi.fn() }));

const get = vi.mocked(apiService.get);
const notFound = Object.assign(new Error("nope"), { response: { status: 404 } });
const reply = (state: string, sent = 0, total: number | null = null) => ({ state, sent, total });

async function settle(promise: Promise<void>) {
  const settled = promise.then(
    () => ({ error: undefined as Error | undefined }),
    (error: Error) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return settled;
}

describe("runBrowserDownload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    get.mockReset();
    vi.mocked(startBrowserDownload).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands the file to the browser with an id to follow it by", async () => {
    get.mockResolvedValue(reply("done"));
    await settle(runBrowserDownload("http://api/files/download/a.psd", vi.fn()));
    const url = vi.mocked(startBrowserDownload).mock.calls[0][0];
    expect(url).toMatch(/^http:\/\/api\/files\/download\/a\.psd\?direct=1&progress_id=[\w-]+$/);
    expect(get.mock.calls[0][0]).toBe(`/files/download/progress/${url.split("progress_id=")[1]}`);
  });

  it("reports how much of how much until it's done", async () => {
    get
      .mockResolvedValueOnce(reply("preparing"))
      .mockResolvedValueOnce(reply("sending", 250, 1000))
      .mockResolvedValueOnce(reply("sending", 1000, 1000))
      .mockResolvedValueOnce(reply("done", 1000, 1000));
    const onProgress = vi.fn();
    const { error } = await settle(runBrowserDownload("u", onProgress));
    expect(error).toBeUndefined();
    expect(onProgress.mock.calls.map(([p]) => p)).toEqual([
      { percent: null, loaded: 0, total: null },
      { percent: 25, loaded: 250, total: 1000 },
      { percent: 99, loaded: 1000, total: 1000 },
    ]);
  });

  it("waits for the request to reach the server", async () => {
    get.mockRejectedValueOnce(notFound).mockRejectedValueOnce(notFound).mockResolvedValueOnce(reply("done"));
    expect((await settle(runBrowserDownload("u", vi.fn()))).error).toBeUndefined();
  });

  it("gives up when the download never starts", async () => {
    get.mockRejectedValue(notFound);
    expect((await settle(runBrowserDownload("u", vi.fn()))).error?.message).toMatch(/didn't start/);
  });

  it("fails when the transfer is cut off", async () => {
    get.mockResolvedValueOnce(reply("sending", 10, 100)).mockResolvedValueOnce(reply("stopped", 10, 100));
    expect((await settle(runBrowserDownload("u", vi.fn()))).error?.message).toMatch(/stopped before finishing/);
  });

  it("rides out a brief network problem", async () => {
    get
      .mockResolvedValueOnce(reply("sending", 10, 100))
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(reply("done", 100, 100));
    expect((await settle(runBrowserDownload("u", vi.fn()))).error).toBeUndefined();
  });

  it("stops watching a download that no longer moves", async () => {
    get.mockResolvedValue(reply("sending", 10, 100));
    expect((await settle(runBrowserDownload("u", vi.fn()))).error?.message).toMatch(/stopped moving/);
  });
});
