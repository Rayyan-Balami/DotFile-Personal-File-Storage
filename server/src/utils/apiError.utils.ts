export class ApiError extends Error {
  public success: boolean;
  public statusCode: number;
  public errors?: Record<string, string>[];  // [{ field: message }]
  public timestamp: string;

  constructor(statusCode: number, errors?: Record<string, string>[]) {
    const defaultMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      409: "Conflict",
      422: "Unprocessable Entity",
      500: "Internal Server Error",
    };

    const message = defaultMessages[statusCode] || "Error";
    super(message);

    this.success = false;
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, ApiError.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,  // from default based on statusCode
      errors: this.errors,    // [{ field: message }]
      timestamp: this.timestamp,
    };
  }
}
