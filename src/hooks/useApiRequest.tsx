"use client";
import { useState } from "react";
import { apiService } from "../api/service";
import { useNavigate } from "react-router-dom";

// GENERIC HOOK
export function useApiRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const sendRequest = async <T = any,>({
    endpoint,
    method = "post",
    data,
    onSuccess,
    onError,
    redirectTo,
  }: {
    endpoint: string;
    method?: "get" | "post" | "put" | "patch" | "delete";
    data?: any;
    onSuccess?: (res: T) => void;
    onError?: (err: any) => void;
    redirectTo?: string;
  }): Promise<T | undefined> => {
    setLoading(true);
    try {
      let res: T | undefined;

      // form-data support
      const isFormData =
        data instanceof FormData ||
        Object.values(data || {}).some(
          (v) => v instanceof File || v instanceof Blob,
        );

      let payload = data;

      if (isFormData && !(data instanceof FormData)) {
        const form = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (Array.isArray(v)) v.forEach((item) => form.append(k, item));
          else if (v !== undefined && v !== null) form.append(k, v as any);
        });
        payload = form;
      }

      const api = {
        get: () => apiService.get<T>(endpoint, payload),
        post: () => apiService.post<T>(endpoint, payload),
        put: () => apiService.put<T>(endpoint, payload),
        patch: () => apiService.patch<T>(endpoint, payload),
        delete: () => apiService.delete<T>(endpoint),
      }[method];

      if (!api) throw new Error(`Unsupported method: ${method}`);

      res = await api();
      onSuccess?.(res);

      if (redirectTo) navigate(redirectTo);

      return res;
    } catch (err: any) {
      console.error("API Error", err);
      onError?.(err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return { sendRequest, loading };
}
