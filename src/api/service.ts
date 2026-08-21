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
