import axios from "axios";
import { useLogout } from "./utilities/hooks/logout";
import { getStorage, setStorage } from "./utilities/services/StorageService";
import { getAccessforRefreshToken } from "./utilities/services/ApiService";


// Axios instance
const api = axios.create();

// Refresh control flags
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

// Request Interceptor — attach token to every request
api.interceptors.request.use((config) => {
  // const logout = useLogout();
  const session = getStorage("session");
  if (session) {
    config.headers["Authorization"] = `Bearer ${session.AccessToken}`;
  }
  return config;
}, (error) => Promise.reject(error)
);

// Response Interceptor — handle expired tokens
api.interceptors.response.use((response) => response, async (error) => {
  // const logout = useLogout();
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
      const tempSession = getStorage("session");
      if (!tempSession) throw new Error("No user data found");
      // if (!tempSession) return console.log("No user data found");
      const response = await getAccessforRefreshToken();

      // Extract new token safely
      // const newToken = response?.access_token;
      // if (!response.access_token) throw new Error("No access token returned from refresh API");
      if (!response) console.log("No access token returned from refresh API");

      // Save new access token
      tempSession.AccessToken = response?.access_token;
      tempSession.RefreshToken = response?.refresh_token
      setStorage("session", tempSession);

      // Resume queued requests
      processQueue(null, tempSession.AccessToken);
      isRefreshing = false;

      // Retry original request with new token
      originalRequest.headers["Authorization"] = `Bearer ${tempSession.AccessToken}`;
      return api(originalRequest);
    } catch (err) {
      console.error("Token refresh failed:", err);
      processQueue(err, null);
      isRefreshing = false;

      // Optional logout if refresh fails
      // clearStorage();
      // window.location.href = "/events-console";
      Logout();
      return Promise.reject(err);
    }
  }
  return Promise.reject(error);
}
);



export default api;
