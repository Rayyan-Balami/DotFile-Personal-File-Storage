import { IS_PRODUCTION } from '@config/constants.js';

// ANSI color codes for terminal styling
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
 * Customized logger for colored, timestamped console output.
 * Skips debug logs in production for cleaner output.
 */
const logger = {
  /**
   * Log info-level message in blue.
   * @param message Message text
   * @param args Additional args for console.log
   */
  info: (message: string, ...args: any[]): void => {
    console.log(`${colors.blue}[INFO] ${message}${colors.reset}`, ...args);
  },

  /**
   * Log success message in green.
   * @param message Success text
   * @param args Extra values to log
   */
  success: (message: string, ...args: any[]): void => {
    console.log(`${colors.green}[SUCCESS] ${message}${colors.reset}`, ...args);
  },

  /**
   * Log warning message in yellow.
   * @param message Warning text
   * @param args Additional details
   */
  warn: (message: string, ...args: any[]): void => {
    console.log(`${colors.yellow}[WARNING] ${message}${colors.reset}`, ...args);
  },

  /**
   * Log error message in red.
   * Shows stack trace only if not in production.
   * @param message Error message or Error object
   * @param args Extra args to log
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
   * Debug log in magenta; outputs only when not in production.
   * @param message Debug message
   * @param args Additional values
   */
  debug: (message: string, ...args: any[]): void => {
    if (!IS_PRODUCTION) {
      console.log(`${colors.magenta}[DEBUG] ${message}${colors.reset}`, ...args);
    }
  },

  /**
   * Developer helper to inspect variables with context and formatting.
   * Logs variable name, call location, and value with colors.
   * Skipped in production.
   * @param value Variable or object to inspect
   * @param label Optional label for variable name
   */
  dev: (value: any, label?: string): void => {
    if (IS_PRODUCTION) return;

    // Capture caller info from stack trace for context
    const stack = new Error().stack;
    const caller = stack ? stack.split('\n')[2].trim() : 'unknown location';

    const varName = label || 'Value';

    // Highlight label and location in cyan + bright
    console.log(`\n${colors.cyan}[DEV] ${varName} ${colors.bright}(${caller})${colors.reset}`);

    // Pretty-print objects/arrays, plain log for primitives
    if (typeof value === 'object' && value !== null) {
      console.dir(value, { depth: null, colors: true });
    } else {
      console.log(`${colors.cyan}→ ${colors.reset}`, value);
    }

    // Visual separator for clarity
    console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}\n`);
  }
};

export default logger;
