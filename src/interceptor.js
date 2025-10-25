import axios from "axios";
import { getAccessforRefreshToken, Logout } from "./services/ApiService";
import { getStorage, setStorage } from "./services/StorageService";



// Axios instance
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

// Request Interceptor — attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = getStorage("AccessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — handle expired tokens
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
        const currentUser = getStorage("user");
        if (!currentUser) throw new Error("No user data found");

        const response = await getAccessforRefreshToken();

        // Extract new token safely
        const newToken = response?.access_token;
        if (!newToken) throw new Error("No access token returned from refresh API");

        // Save new access token
        setStorage("AccessToken", newToken);

        // Resume queued requests
        processQueue(null, newToken);
        isRefreshing = false;

        // Retry original request with new token
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed:", err);
        processQueue(err, null);
        isRefreshing = false;

        // Optional logout if refresh fails
        Logout();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
