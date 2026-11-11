import { isAxiosError, type AxiosRequestConfig } from "axios";
import axiosClient from "./client";
import { runGuardedTransfer } from "./transfer";

// With responseType "blob", an error response's JSON body arrives as a Blob
// too - read it back so `detail` can be shown like on any other request.
async function readBlobError(err: unknown) {
  if (!isAxiosError(err) || !err.response || !(err.response.data instanceof Blob)) return;
  try {
    err.response.data = JSON.parse(await err.response.data.text());
  } catch {
    err.response.data = {};
  }
}

export const apiService = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosClient.get(url, config);
    return res.data;
  },
  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return (await axiosClient.post(url, data, config)).data;
  },
  postWithProgress: async <T>(
    url: string,
    data: unknown,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    runGuardedTransfer(signal, async (guardedSignal, touch) => {
      const res = await axiosClient.post(url, data, {
        ...config,
        timeout: 0,
        onUploadProgress: (event) => {
          touch();
          if (event.total) {
            // Capped at 99 like getWithProgress below, and for the same
            // kind of reason: this hits 100 the instant the browser finishes
            // *sending* the request body, which isn't the same moment as the
            // server finishing processing it (writing the file to disk, etc)
            // and responding. Reporting a bare 100 here left the UI showing
            // "100%" while the item was still status: "uploading" for
            // however long that gap was - long enough, under load, to look
            // permanently stuck. 100 is now reserved for once the caller's
            // own promise actually resolves and it sets status: "done" itself.
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            onProgress(percent);
          }
        },
        signal: guardedSignal,
      });
      return res.data;
    }),
  getWithProgress: async <T>(
    url: string,
    onProgress: (progress: {
      percent: number | null;
      loaded: number;
      total: number | null;
    }) => void,
    config?: AxiosRequestConfig,
  ): Promise<T> =>
    runGuardedTransfer(config?.signal as AbortSignal | undefined, async (guardedSignal, touch) => {
      const res = await axiosClient.get(url, {
        ...config,
        timeout: 0,
        signal: guardedSignal,
        onDownloadProgress: (event) => {
          touch();
          const percent = event.total
            ? Math.min(99, Math.round((event.loaded / event.total) * 100))
            : null;
          onProgress({ percent, loaded: event.loaded, total: event.total ?? null });
        },
      }).catch(async (err) => {
        await readBlobError(err);
        throw err;
      });

      // Never hand a cut-off file to the browser to save as if it were complete.
      const expected = Number(res.headers["content-length"]);
      if (res.data instanceof Blob && expected && res.data.size !== expected) {
        throw new Error(`Incomplete download: got ${res.data.size} of ${expected} bytes`);
      }
      return res.data;
    }),
  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return (await axiosClient.put(url, data, config)).data;
  },
  patch: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return (await axiosClient.patch(url, data, config)).data;
  },
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return (await axiosClient.delete(url, config)).data;
  },
};
