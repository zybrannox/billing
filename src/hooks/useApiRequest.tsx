"use client";
import { useState } from "react";
import { apiService } from "../api/service";
import { useNavigate } from "react-router-dom";
import { isAxiosError, type AxiosRequestConfig } from "axios";

// GENERIC HOOK
export function useApiRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const sendRequest = async <T = unknown,>({
    endpoint,
    method = "post",
    data,
    onSuccess,
    onError,
    redirectTo,
  }: {
    endpoint: string;
    method?: "get" | "post" | "put" | "patch" | "delete";
    data?: unknown;
    onSuccess?: (res: T) => void;
    // Pass it to getErrorMessage / getErrorDetail in utils/apiError.
    onError?: (err: unknown) => void;
    redirectTo?: string;
  }): Promise<T | undefined> => {
    setLoading(true);
    try {
      // form-data support
      const isFormData =
        data instanceof FormData ||
        Object.values(data ?? {}).some(
          (v) => v instanceof File || v instanceof Blob,
        );

      let payload = data;

      if (isFormData && !(data instanceof FormData)) {
        const form = new FormData();
        Object.entries(data as object).forEach(([k, v]) => {
          if (Array.isArray(v)) v.forEach((item) => form.append(k, item));
          else if (v !== undefined && v !== null) form.append(k, v as string | Blob);
        });
        payload = form;
      }

      const api = {
        get: () => apiService.get<T>(endpoint, payload as AxiosRequestConfig | undefined),
        post: () => apiService.post<T>(endpoint, payload),
        put: () => apiService.put<T>(endpoint, payload),
        patch: () => apiService.patch<T>(endpoint, payload),
        delete: () => apiService.delete<T>(endpoint),
      }[method];

      if (!api) throw new Error(`Unsupported method: ${method}`);

      const res = await api();
      onSuccess?.(res);

      if (redirectTo) navigate(redirectTo);

      return res;
    } catch (err) {
      // Status only: the error object carries the request body, which for a
      // login or password change means the password.
      console.error("API Error", method, endpoint, isAxiosError(err) ? err.response?.status : "no response");
      onError?.(isAxiosError(err) ? err.response?.data || err : err);
    } finally {
      setLoading(false);
    }
  };

  return { sendRequest, loading };
}
