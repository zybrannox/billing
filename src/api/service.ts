import type { AxiosRequestConfig } from "axios";
import axiosClient from "./client";

export const apiService = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosClient.get(url, config);
    return res.data;
  },
  post: async <T>(url: string, data?: any): Promise<T> => {
    return (await axiosClient.post(url, data)).data;
  },
  postWithProgress: async <T>(
    url: string,
    data: any,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<T> => {
    const res = await axiosClient.post(url, data, {
      onUploadProgress: (event) => {
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
      signal,
    });
    return res.data;
  },
  getWithProgress: async <T>(
    url: string,
    onProgress: (progress: {
      percent: number | null;
      loaded: number;
      total: number | null;
    }) => void,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const res = await axiosClient.get(url, {
      ...config,
      onDownloadProgress: (event) => {
        const percent = event.total
          ? Math.min(99, Math.round((event.loaded / event.total) * 100))
          : null;
        onProgress({ percent, loaded: event.loaded, total: event.total ?? null });
      },
    });
    return res.data;
  },
  put: async <T>(url: string, data?: any): Promise<T> => {
    return (await axiosClient.put(url, data)).data;
  },
  patch: async <T>(url: string, data?: any): Promise<T> => {
    return (await axiosClient.patch(url, data)).data;
  },
  delete: async <T>(url: string): Promise<T> => {
    return (await axiosClient.delete(url)).data;
  },
};
