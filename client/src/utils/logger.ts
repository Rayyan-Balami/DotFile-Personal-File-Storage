// Get the environment constant
const IS_PRODUCTION = import.meta.env.PROD;

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
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

    console.error(
      `${colors.red}[ERROR] ${errorMessage}${colors.reset}`,
      ...args
    );
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
    const caller = stack ? stack.split("\n")[2].trim() : "unknown location";

    // Format the label
    const varName = label || "Value";

    // Log with cyan color for high visibility
    console.log(
      `\n${colors.cyan}[DEV] ${varName} ${colors.bright}(${caller})${colors.reset}`
    );

    // Use special formatting for objects and arrays
    if (typeof value === "object" && value !== null) {
      console.dir(value, { depth: null, colors: true });
    } else {
      console.log(`${colors.cyan}→ ${colors.reset}`, value);
    }

    // Add a separator for better readability
    console.log(`${colors.cyan}${"─".repeat(50)}${colors.reset}\n`);
  },
};
