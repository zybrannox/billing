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
  ): Promise<T> => {
    const res = await axiosClient.post(url, data, {
      onUploadProgress: (event) => {
        if (event.total) {
          const percent = (event.loaded / event.total) * 100;
          onProgress(percent);
        }
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
