import axios from "axios";
import { useAppStore } from "../store/useAppStore";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends the httpOnly access_token cookie automatically
  timeout: 120000, // 2 minutes
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
