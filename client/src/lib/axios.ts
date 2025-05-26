import { VITE_API_BASE_URL, VITE_API_TIMEOUT } from "@/config/constants";
import { useAuthStore } from "@/stores/authStore";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

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

    // Try refreshing token on first 401
    if (
      status === 401 &&
      !originalRequest._retry &&
      useAuthStore.getState().accessToken &&
      // Don't try to refresh if we're already on the refresh token endpoint
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
            // Get the refresh token from cookies if possible
            const refreshToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('refreshToken='))
              ?.split('=')[1];
              
            // Use axios directly instead of userApi to avoid circular dependency
            const response = await axios.post(
              `${VITE_API_BASE_URL}/auth/refresh-token`, 
              { refreshToken }, 
              { withCredentials: true }
            );
            
            // Extract data based on server controller response structure
            console.log("Token refresh response:", response.data);
            const { user, accessToken } = response.data.data;
            
            if (!accessToken) {
              console.error("No access token received in refresh response");
              throw new Error("Invalid token refresh response");
            }
            
            const authStore = useAuthStore.getState();
            if (user) {
              console.log("Setting new auth with user and token");
              authStore.setAuth(user, accessToken);
            } else {
              console.log("Setting new access token only");
              authStore.setAccessToken(accessToken);
            }

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            onRefreshed(accessToken);
            isRefreshing = false;

            return API(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          isRefreshing = false;
          handleAuthFailure();
          return Promise.reject(refreshError);
        }
      } else {
        return new Promise((resolve) => {
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
      ((status === 403 && originalRequest.url?.includes('/users/me')))
    ) {
      handleAuthFailure();
    }

    return Promise.reject(error);
  }
);

export default API;
