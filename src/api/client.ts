// src/api/axiosClient.ts
import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends the httpOnly access_token cookie automatically
  timeout: 120000, // 2 minutes
});

// 💡 Handle global errors
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default axiosClient;
