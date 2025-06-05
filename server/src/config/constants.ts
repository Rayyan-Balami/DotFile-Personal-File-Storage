import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// ==============================
// ENVIRONMENT
// ==============================
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 3000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ==============================
// API CONFIG
// ==============================
export const API_PREFIX = '/api';
export const API_VERSION = 'v1';

// ==============================
// DATABASE
// ==============================
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dotfile';

// ==============================
// AUTH SECRETS
// ==============================
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const MASTER_KEY = process.env.MASTER_KEY || 'CollegeProjectAESMasterKey2025';

// ==============================
// PATHS
// ==============================
export const $filename = fileURLToPath(import.meta.url);
export const $dirname = dirname($filename);
export const ROOT_DIR = join($dirname, '..', '..');
export const UPLOADS_DIR = join(ROOT_DIR, 'uploads');
export const PUBLIC_DIR = join(ROOT_DIR, 'public');
export const AVATARS_DIR = join(PUBLIC_DIR, 'avatars');
export const DEFAULT_USER_AVATAR_URL = '/avatars/default-user-avatar.png';

// ==============================
// LIMITS
// ==============================
export const MAX_FOLDER_DEPTH = 5;
export const MAX_FILES_PER_FOLDER = 20;
export const MAX_FILES_PER_UPLOAD_BATCH = 20;
export const MAX_SIZE_PER_UPLOAD_BATCH = 52428800; // 50 MB
export const MAX_AVATAR_SIZE = 2097152; // 2 MB
export const ZIP_NAME_PREFIX = 'rY1b-fol-zip-';
