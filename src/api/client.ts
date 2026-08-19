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
    // A 401 from the login call itself just means "wrong password" - it
    // isn't a session expiry, so redirecting would reload the page the
    // user is already on instead of showing the credentials error.
    const isLoginRequest = err?.config?.url?.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default axiosClient;
