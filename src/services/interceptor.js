import axios from "axios";
import { getAccessforRefreshToken } from "./ApiService";
import { get, set } from "./StorageService";



// ✅ Axios instance
const api = axios.create();

// Refresh control flags
let isRefreshing = false;
let failedQueue = [];

// Helper to resolve/reject queued requests
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ✅ Request Interceptor — attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = get("AccessToken");
    if (token && !config.url.startsWith("https://api.800.com")) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response Interceptor — handle expired tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven’t retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentUser = get("user");
        if (!currentUser) throw new Error("No user data found");

        // ✅ Await refresh token call
        const response = await getAccessforRefreshToken();

        console.log("Refresh Token API Response:", response.data);

        // Extract new token safely
        const newToken = response?.data?.access_token || response?.access_token;
        if (!newToken) throw new Error("No access token returned from refresh API");

        // ✅ Save new access token
        set("AccessToken", newToken);

        // ✅ Resume queued requests
        processQueue(null, newToken);
        isRefreshing = false;

        // ✅ Retry original request with new token
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed:", err);
        processQueue(err, null);
        isRefreshing = false;

        // Optional logout if refresh fails
        localStorage.clear();
        window.location.href = "/";

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
