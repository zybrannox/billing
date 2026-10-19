import axios from "axios";
import { useClientAppStore } from "../store/useClientAppStore";

// A second axios instance, mirroring client.ts - a separate cookie
// (client_access_token, set by /client-auth/login) rides on this one, kept
// entirely apart from the staff session's own axiosClient/access_token so
// a 401 on one side never clears or redirects the other.
const portalAxiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 120000,
  // Required by the API on every cookie-authenticated write (CSRF defence -
  // see the backend's app/web_security.py): a header a cross-site form can't
  // set and a cross-site script can't send without passing CORS.
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

portalAxiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";

    const isExpected401Check =
      url.includes("/client-auth/login") || url.includes("/client-auth/me");

    if (status === 401 && !isExpected401Check) {
      useClientAppStore.getState().clearClientUser();
      window.location.href = "/portal/login";
    }

    return Promise.reject(err);
  }
);

export default portalAxiosClient;
