import type { AxiosRequestConfig } from "axios";
import portalAxiosClient from "./portalClient";

// Mirrors api/service.ts's apiService exactly, just backed by
// portalAxiosClient instead of the staff axiosClient - see that file for
// why each method is shaped the way it is.
export const portalApiService = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await portalAxiosClient.get(url, config);
    return res.data;
  },
  post: async <T>(url: string, data?: any): Promise<T> => {
    return (await portalAxiosClient.post(url, data)).data;
  },
  postWithProgress: async <T>(
    url: string,
    data: any,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<T> => {
    const res = await portalAxiosClient.post(url, data, {
      onUploadProgress: (event) => {
        if (event.total) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      },
      signal,
    });
    return res.data;
  },
  put: async <T>(url: string, data?: any): Promise<T> => {
    return (await portalAxiosClient.put(url, data)).data;
  },
  patch: async <T>(url: string, data?: any): Promise<T> => {
    return (await portalAxiosClient.patch(url, data)).data;
  },
  delete: async <T>(url: string): Promise<T> => {
    return (await portalAxiosClient.delete(url)).data;
  },
};
