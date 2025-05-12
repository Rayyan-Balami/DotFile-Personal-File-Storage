import { VITE_API_BASE_URL, VITE_API_TIMEOUT } from "@/config/constants";
import { useAuthStore } from "@/stores/authStore";
import axios, { InternalAxiosRequestConfig } from "axios";
import userApi from "@/api/user/user.api";

const API = axios.create({
  baseURL: VITE_API_BASE_URL,
  withCredentials: true,
  timeout: VITE_API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const handleAuthFailure = () => {
  useAuthStore.getState().clearAuth();
  window.location.href = "/login";
};

// Request interceptor
API.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const url = originalRequest?.url;

    // Try refreshing token on first 401
    if (
      status === 401 &&
      !originalRequest._retry &&
      useAuthStore.getState().accessToken
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const response = await userApi.refreshToken({});
          const { accessToken, user } = response.data;

          const authStore = useAuthStore.getState();
          if (user) {
            authStore.setAuth(user, accessToken);
          } else {
            authStore.setAccessToken(accessToken);
          }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          onRefreshed(accessToken);
          isRefreshing = false;

          return API(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          handleAuthFailure();
          return Promise.reject(refreshError);
        }
      } else {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(API(originalRequest));
          });
        });
      }
    }

    // If still failing OR first response is a fatal auth-related 403/404
    if (
      (status === 401 && originalRequest._retry) ||
      ((status === 403 || status === 404))
    ) {
      handleAuthFailure();
    }

    return Promise.reject(error);
  }
);

export default API;
