import axios from "axios";
import { useAppStore } from "../store/useAppStore";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends the httpOnly access_token cookie automatically
  timeout: 120000, // 2 minutes
  // Required by the API on every cookie-authenticated write (CSRF defence -
  // see the backend's app/web_security.py): a header a cross-site form can't
  // set and a cross-site script can't send without passing CORS.
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Handle global errors
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";
 
    const isExpected401Check =
      url.includes("/auth/login") || url.includes("/auth/me");

    if (status === 401 && !isExpected401Check) {
      useAppStore.getState().clearUser();
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default axiosClient;
