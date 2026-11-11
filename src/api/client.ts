import axios from "axios";
import { useAppStore } from "../store/useAppStore";
import { useNoticeStore } from "../store/useNoticeStore";
import { failureNotice, successNotice } from "./actionNotices";

declare module "axios" {
  interface AxiosRequestConfig {
    /**
     * Whether this change reports in the top-right corner (api/actionNotices.ts):
     * true by default; "errors" when the screen announces success itself;
     * "success" when a form shows its own error next to the fields;
     * false for quiet background work (cleanup, retries).
     */
    notify?: boolean | "errors" | "success";
  }
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends the httpOnly access_token cookie automatically
  timeout: 120000, // 2 minutes
  // Required by the API on every cookie-authenticated write (CSRF defence -
  // see the backend's app/web_security.py): a header a cross-site form can't
  // set and a cross-site script can't send without passing CORS.
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

const CHANGES = new Set(["post", "put", "patch", "delete"]);
const isChange = (method?: string) => CHANGES.has((method ?? "get").toLowerCase());

axiosClient.interceptors.response.use(
  (res) => {
    const { method, url, data, notify: mode } = res.config;
    if (isChange(method) && mode !== false && mode !== "errors") {
      const notice = successNotice(method!.toLowerCase(), url, data, res.data);
      if (notice) useNoticeStore.getState().push(notice);
    }
    return res;
  },
  (err) => {
    const status = err?.response?.status;
    const config = err?.config ?? {};
    const url = config.url || "";

    const isExpected401Check = url.includes("/auth/login") || url.includes("/auth/me");

    if (status === 401 && !isExpected401Check) {
      useAppStore.getState().clearUser();
      window.location.href = "/login";
    }

    // Every failed change says so, and why, unless the caller asked for quiet.
    if (isChange(config.method) && config.notify !== false && config.notify !== "success") {
      const notice = failureNotice(config.method.toLowerCase(), url, err);
      if (notice) useNoticeStore.getState().push(notice);
    }

    return Promise.reject(err);
  },
);

export default axiosClient;
