// src/api/axiosClient.ts
import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // allows sending cookies
  timeout: 120000, // 2 minutes
});


// 💡 Auto-attach token if exists
axiosClient.interceptors.request.use((config) => {
  const token = document.cookie
    ?.split("; ")
    ?.find((i) => i.startsWith("token="))
    ?.split("=")[1];

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
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
