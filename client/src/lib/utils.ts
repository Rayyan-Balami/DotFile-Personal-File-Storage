import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { IS_PRODUCTION } from '@/config/constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Customized logger with colored output and timestamp
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message: string, ...args: any[]): void => {
    console.log(`${colors.blue}[INFO] ${message}${colors.reset}`, ...args);
  },
  
  /**
   * Log success message
   */
  success: (message: string, ...args: any[]): void => {
    console.log(`${colors.green}[SUCCESS] ${message}${colors.reset}`, ...args);
  },
  
  /**
   * Log warning message
   */
  warn: (message: string, ...args: any[]): void => {
    console.log(`${colors.yellow}[WARNING] ${message}${colors.reset}`, ...args);
  },
  
  /**
   * Log error message
   */
  error: (message: string | Error, ...args: any[]): void => {
    const errorMessage = message instanceof Error ? message.message : message;
    const stack = message instanceof Error ? message.stack : null;
    
    console.error(`${colors.red}[ERROR] ${errorMessage}${colors.reset}`, ...args);
    if (stack && !IS_PRODUCTION) {
      console.error(`${colors.red}[STACK] ${stack}${colors.reset}`);
    }
  },
  
  /**
   * Log debug message (only in non-production)
   */
  debug: (message: string, ...args: any[]): void => {
    if (!IS_PRODUCTION) {
      console.log(`${colors.magenta}[DEBUG] ${message}${colors.reset}`, ...args);
    }
  },
  
  /**
   * Developer debug helper for inspecting values during development
   * Displays variable name, file location, and formatted value inspection
   */
  dev: (value: any, label?: string): void => {
    if (IS_PRODUCTION) return;
    
    // Get calling location
    const stack = new Error().stack;
    const caller = stack ? stack.split('\n')[2].trim() : 'unknown location';
    
    // Format the label
    const varName = label || 'Value';
    
    // Log with cyan color for high visibility
    console.log(`\n${colors.cyan}[DEV] ${varName} ${colors.bright}(${caller})${colors.reset}`);
    
    // Use special formatting for objects and arrays
    if (typeof value === 'object' && value !== null) {
      console.dir(value, { depth: null, colors: true });
    } else {
      console.log(`${colors.cyan}→ ${colors.reset}`, value);
    }
    
    // Add a separator for better readability
    console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}\n`);
  }
};

// Get initials from a name (e.g., "John Doe" -> "JD")
export const getInitials = (name: string): string => {
  if (!name) return "";
  
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Format bytes as human-readable string
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
