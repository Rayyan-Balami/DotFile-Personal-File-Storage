// Environment
export const VITE_ENV = import.meta.env.VITE_ENV || "development";
export const IS_DEVELOPMENT = VITE_ENV === "development";
export const IS_PRODUCTION = VITE_ENV === "production";

// App Information (static values, not env-based)
export const VITE_APP_NAME = "Dot File";
export const VITE_APP_VERSION = "0.1.0";
export const VITE_APP_DESCRIPTION = "Personal File Storage";
export const VITE_APP_AUTHOR = "Rayyan Balami";
export const VITE_APP_AUTHOR_URL = "https://rayyanbalami.com";
export const VITE_APP_COPYRIGHT = `Copyright © 2025 ${VITE_APP_AUTHOR}`;

// API Configuration
export const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const VITE_API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api";
export const VITE_API_VERSION = import.meta.env.VITE_API_VERSION || "v1";
export const VITE_API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;
export const VITE_API_BASE_URL = `${VITE_API_URL}${VITE_API_PREFIX}/${VITE_API_VERSION}`;

// Upload Zip Prefix
export const VITE_ZIP_NAME_PREFIX = import.meta.env.VITE_ZIP_NAME_PREFIX || "rY1b-fol-zip-";
