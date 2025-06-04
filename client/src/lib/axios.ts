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
            // Use axios directly instead of userApi to avoid circular dependency
            const response = await axios.post(
              `${VITE_API_BASE_URL}/auth/refresh-token`, 
              {}, 
              { 
                withCredentials: true,
                headers: {
                  'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
                }
              }
            );
            
            // Extract data based on server controller response structure
            const { accessToken } = response.data.data;
            
            if (!accessToken) {
              throw new Error("No access token received in refresh response");
            }

            // Update auth store with new token
            useAuthStore.getState().setAccessToken(accessToken);

            // Update the failed request with new token and retry
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            onRefreshed(accessToken);
            isRefreshing = false;

            // Retry the original request
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

    // Handle authentication failures
    if (
      // If token refresh failed
      (status === 401 && originalRequest._retry) ||
      // If accessing protected route fails after token refresh
      (status === 403 && originalRequest.url?.includes('/users/me')) ||
      // If refresh token endpoint fails
      (status === 401 && originalRequest.url?.includes('/auth/refresh-token'))
    ) {
      console.log('Authentication failed, redirecting to login...');
      handleAuthFailure();
      return Promise.reject(new Error('Authentication failed'));
    }

    return Promise.reject(error);
  }
);

export default API;
