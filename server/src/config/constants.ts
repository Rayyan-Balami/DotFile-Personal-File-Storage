import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

//==============================
// ENVIRONMENT
//==============================
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

//==============================
// SERVER
//==============================
export const PORT = Number(process.env.PORT) || 3000;
export const API_PREFIX = process.env.API_PREFIX || '/api';
export const API_VERSION = process.env.API_VERSION || 'v1';
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

//==============================
// DATABASE
//==============================
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dotfile';

//==============================
// AUTH
//==============================
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const MASTER_KEY = process.env.MASTER_KEY || 'CollegeProjectAESMasterKey2025';

//==============================
// PATHS
//==============================
export const $filename = fileURLToPath(import.meta.url);
export const $dirname = dirname($filename);
export const ROOT_DIR = join($dirname, '..', '..');
export const UPLOADS_DIR = join(ROOT_DIR, 'uploads');
export const PUBLIC_DIR = join(ROOT_DIR, 'public');
export const USER_AVATAR_PATH = join(PUBLIC_DIR, 'images/default-user-avatar.png'); // Server-side
export const DEFAULT_USER_AVATAR_URL = '/avatars/default-user-avatar.png';                   // Public URL

//==============================
// LIMITS
//==============================
export const MAX_FOLDER_DEPTH = Number(process.env.MAX_FOLDER_DEPTH) || 10;
export const MAX_FILES_PER_FOLDER = Number(process.env.MAX_FILES_PER_FOLDER) || 50;
export const MAX_FILES_PER_UPLOAD_BATCH = Number(process.env.MAX_FILES_PER_UPLOAD_BATCH) || 50;
export const MAX_SIZE_PER_UPLOAD_BATCH = Number(process.env.MAX_SIZE_PER_UPLOAD_BATCH) || 262144000; // 250MB
export const ZIP_NAME_PREFIX = process.env.ZIP_NAME_PREFIX || '__fezip__-';
