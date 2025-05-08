import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Server
export const PORT = Number(process.env.PORT) || 3000;
export const API_PREFIX = process.env.API_PREFIX || '/api';
export const API_VERSION = process.env.API_VERSION || 'v1';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Database
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dotfile';

// Authentication
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Path constants - Fixed
export const $filename = fileURLToPath(import.meta.url);
export const $dirname = dirname($filename); // Get directory containing the file
export const ROOT_DIR = join($dirname, '..', '..'); // Go up two levels from config dir
export const UPLOADS_DIR = join(ROOT_DIR, 'uploads');
export const PUBLIC_DIR = join(ROOT_DIR, 'public');

// Keep this for filesystem operations
export const DEFAULT_USER_AVATAR_PATH = join(PUBLIC_DIR, 'images/default-user-avatar.png');

// Add this for storing in database and sending in API responses
export const DEFAULT_USER_AVATAR_URL = '/images/default-user-avatar.png';

export const MAX_FOLDER_DEPTH = Number(process.env.MAX_FOLDER_DEPTH) || 10;
export const MAX_FILES_PER_FOLDER = Number(process.env.MAX_FILES_PER_FOLDER) || 50;
export const MAX_FILES_PER_UPLOAD_BATCH = Number(process.env.MAX_FILES_PER_UPLOAD_BATCH) || 50;
export const MAX_SIZE_PER_UPLOAD_BATCH = Number(process.env.MAX_SIZE_PER_UPLOAD_BATCH) || 262144000; // 250 MB