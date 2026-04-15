import axios from "axios";
import { useLogout } from "./utilities/hooks/logout";
import { clearStorage, getStorage, setStorage } from "./utilities/services/StorageService";
import { getAccessforRefreshToken } from "./utilities/services/ApiService";


// Axios instance
const api = axios.create();

let session = null;
let isRefreshing = false;
let failedQueue = [];
const Logout = () => useLogout();

// Helper to resolve/reject queued requests
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Request Interceptor
api.interceptors.request.use((config) => {
  session = getStorage("session");
  if (session) {
    config.headers["Authorization"] = `Bearer ${session?.AccessToken}`;
  }
  return config;
}, (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error.config;

  // If 401 error and we haven’t retried yet
  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers["Authorization"] = `Bearer ${token}`;
        return api(originalRequest);
      }).catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // const tempSession = getStorage("session");
      if (!session) throw new Error("No user data found");

      const response = await getAccessforRefreshToken();
      if (!response) throw new Error("No access token returned from refresh API");

      // Save new access token
      session.AccessToken = response?.access_token;
      session.RefreshToken = response?.refresh_token
      setStorage("session", session);

      // Resume queued requests
      processQueue(null, session.AccessToken);
      isRefreshing = false;

      // Retry original request with new token
      originalRequest.headers["Authorization"] = `Bearer ${session.AccessToken}`;
      return api(originalRequest);
    } catch (err) {
      console.error("Token refresh failed:", err);
      processQueue(err, null);
      isRefreshing = false;

      // Optional logout if refresh fails
      alert('Session data missing!');
      window.location.href = "/events-console";
      clearStorage();
      // Logout();
      return Promise.reject(err);
    }
  }
  return Promise.reject(error);
}
);

export default api;
