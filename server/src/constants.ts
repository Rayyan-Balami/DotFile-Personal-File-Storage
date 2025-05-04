import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// Server
export const PORT = Number(process.env.PORT) || 3000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Database
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dotfile';

// Authentication
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';


// Path constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
export const ROOT_DIR = join(__dirname, '..');
export const UPLOADS_DIR = join(ROOT_DIR, 'uploads');
export const PUBLIC_DIR = join(ROOT_DIR, 'public');
// Default user avatar
export const DEFAULT_USER_AVATAR = join(PUBLIC_DIR, 'images/default-user-avatar.png');