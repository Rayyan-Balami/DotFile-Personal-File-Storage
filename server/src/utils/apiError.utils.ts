/**
 * Custom error class for API errors with HTTP status and structured messages.
 */
export class ApiError extends Error {
  public success: boolean;
  public statusCode: number;
  public errors?: Record<string, string>[]; // Array of field-message pairs
  public timestamp: string;

  /**
   * Create an ApiError.
   * @param statusCode HTTP status code (e.g., 400, 404)
   * @param errors Optional list of detailed errors per field
   */
  constructor(statusCode: number, errors?: Record<string, string>[]) {
    // Map status codes to default messages
    const defaultMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      409: "Conflict",
      422: "Unprocessable Entity",
      500: "Internal Server Error",
    };

    // Use default message or fallback to generic "Error"
    const message = defaultMessages[statusCode] || "Error";
    super(message);

    this.success = false;             // Indicate failure
    this.statusCode = statusCode;     // Store HTTP status
    this.errors = errors;             // Store validation or other errors
    this.timestamp = new Date().toISOString(); // Timestamp error creation

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);

    // Capture stack trace (if supported)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Format error object for JSON serialization.
   * @returns JSON-friendly error representation
   */
  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      timestamp: this.timestamp,
    };
  }
}
