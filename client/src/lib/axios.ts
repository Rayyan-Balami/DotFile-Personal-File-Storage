import { VITE_API_BASE_URL, VITE_API_TIMEOUT } from "@/config/constants";
import { useAuthStore } from "@/stores/authStore";
import axios, { InternalAxiosRequestConfig } from "axios";
import userApi from "@/api/user/user.api";

const API = axios.create({
  baseURL: VITE_API_BASE_URL,
  withCredentials: true, // This is crucial for sending/receiving cookies
  timeout: VITE_API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing the token
let isRefreshing = false;
// Store requests that should be retried after token refresh
let refreshSubscribers: ((token: string) => void)[] = [];

// Function to add request to queue
const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Function to process the queue with new token
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Request interceptor to add token to requests
API.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If the error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if we're not already refreshing
      if (!isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Use the existing userApi function instead of direct API call
          // Empty object since refresh token is in cookies
          const response = await userApi.refreshToken({});

          // Extract new access token and user data
          const { accessToken, user } = response.data;

          // Update both token AND user data in store
          const authStore = useAuthStore.getState();
          if (user) {
            // Use setAuth to update both user and token
            authStore.setAuth(user, accessToken);
          } else {
            // Fallback if for some reason user data isn't included
            authStore.setAccessToken(accessToken);
          }

          // Update the header for the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Process any queued requests
          onRefreshed(accessToken);
          isRefreshing = false;

          // Retry the original request
          return API(originalRequest);
        } catch (refreshError) {
          // If refresh fails, logout
          isRefreshing = false;
          useAuthStore.getState().clearAuth();
          return Promise.reject(refreshError);
        }
      } else {
        // If we're already refreshing, queue this request
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(API(originalRequest));
          });
        });
      }
    }

    return Promise.reject(error);
  }
);

export default API;
