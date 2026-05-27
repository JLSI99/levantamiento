import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.clear();
        window.dispatchEvent(new Event('auth_logout'));
        return Promise.reject(error);
      }

      return new Promise((resolve, reject) => {
        axios
          .post(`${API_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          })
          .then((res) => {
            if (res.status === 200) {
              const { access_token, refresh_token } = res.data;

              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', refresh_token);

              apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
              originalRequest.headers.Authorization = `Bearer ${access_token}`;

              window.dispatchEvent(new Event('auth_token_refreshed'));

              processQueue(null, access_token);
              resolve(apiClient(originalRequest));
            }
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            localStorage.clear();
            window.dispatchEvent(new Event('auth_logout'));
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);