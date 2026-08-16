// src/api/apiService.ts
import type { AxiosRequestConfig } from "axios";
import axiosClient from "./client";

export const apiService = {
  // get: async <T>(url: string, params?: any): Promise<T> => {
  //   const res = await axiosClient.get(url, { params });
  //   return res.data;
  // },
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
          const percent = (event.loaded / event.total) * 100;
          onProgress(percent);
        }
      },
      signal,
    });
    return res.data;
  },
  getWithProgress: async <T>(
    url: string,
    onProgress: (progress: { percent: number | null; loaded: number }) => void,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const res = await axiosClient.get(url, {
      ...config,
      onDownloadProgress: (event) => {
        // event.total is only present when the server sends Content-Length
        // (e.g. single-file downloads). Streamed responses like zip
        // generation don't know their final size upfront, so we fall back
        // to reporting bytes downloaded instead of a percentage.
        // Clamp to 99% — a gzip-compressed response reports Content-Length
        // as the compressed size, but the browser delivers decompressed
        // bytes, so loaded/total can slightly overshoot 100 before done.
        const percent = event.total
          ? Math.min(99, Math.round((event.loaded / event.total) * 100))
          : null;
        onProgress({ percent, loaded: event.loaded });
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
