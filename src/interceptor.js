import axios from "axios";
import { environment } from "./environment";
import { clearStorage, getStorage, setStorage } from "./utilities/services/StorageService";

const api = axios.create();

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const refreshAccessToken = async () => {
  const session = getStorage("session");
  const url = `${environment.login_url}/getAccessforRefreshToken`;

  return axios.post(url, null, {
    params: {
      refresh_token: session?.RefreshToken,
      modifiedBy: session?.UserId,
    },
  }).then((res) => res.data);
};

api.interceptors.request.use(
  (config) => {
    const session = getStorage("session");
    if (session?.AccessToken) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${session.AccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers["Authorization"] = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const session = getStorage("session");
      if (!session?.RefreshToken) throw new Error("No refresh token found");

      const response = await refreshAccessToken();
      const accessToken = response?.access_token ?? response?.AccessToken;
      const refreshToken = response?.refresh_token ?? response?.RefreshToken;
      if (!accessToken) throw new Error("No access token returned from refresh API");

      const updatedSession = {
        ...session,
        AccessToken: accessToken,
        RefreshToken: refreshToken ?? session.RefreshToken,
      };
      setStorage("session", updatedSession);

      processQueue(null, updatedSession.AccessToken);

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers["Authorization"] = `Bearer ${updatedSession.AccessToken}`;
      return api(originalRequest);
    } catch (err) {
      console.error("Token refresh failed:", err);
      processQueue(err, null);
      alert("Session expired. Please log in again.");
      clearStorage();
      window.location.href = "/events-console";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
