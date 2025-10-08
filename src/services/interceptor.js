import axios from 'axios';
import { environment } from '../environment';
import { get, set } from './StorageService';

import {getAccessforRefreshToken} from './metadataService'

// Axios instance (no baseURL, no timeout)
const api = axios.create();

// Flag and queue for refreshing token
let isRefreshing = false;
let failedQueue = [];

// Helper to process queued requests
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request interceptor: attach token
api.interceptors.request.use(
    (config) => {
        const token = get('AccessToken'); 
        if (token && !config.url.startsWith('https://api.800.com')) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue request while refreshing
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then((token) => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return api(originalRequest);
                })
                .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const currentUser = get('user'); 
                if (!currentUser) throw new Error('No user data found');

                // Refresh token API
                const response = getAccessforRefreshToken();
                console.log(response)
                const newToken = response.access_token;
                set('AccessToken', newToken);

                processQueue(null, newToken);
                isRefreshing = false;

                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (err) {
                processQueue(err, null);
                isRefreshing = false;

                // Optional: log out user
                localStorage.clear();
                // window.location.href = '/login';

                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
