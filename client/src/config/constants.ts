export const VITE_ENV = import.meta.env.VITE_ENV || "development";
export const IS_DEVELOPMENT = VITE_ENV === "development";
export const IS_PRODUCTION = VITE_ENV === "production";

export const VITE_APP_NAME = import.meta.env.VITE_APP_NAME || "DotFile";
export const VITE_APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.1.0";
export const VITE_APP_DESCRIPTION =
  import.meta.env.VITE_APP_DESCRIPTION || "Cloud Storage Solution";
export const VITE_APP_AUTHOR =
  import.meta.env.VITE_APP_AUTHOR || "Rayyan Balami";
export const VITE_APP_AUTHOR_URL =
  import.meta.env.VITE_APP_AUTHOR_URL || "https://rayyanbalami.com.np";

export const VITE_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const VITE_API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 10000; // 10 seconds timeout
export const VITE_API_VERSION = import.meta.env.VITE_API_VERSION || "v1"; // API version
export const VITE_API_BASE_URL = `${VITE_API_URL}/${VITE_API_VERSION}`; // Base URL for API
