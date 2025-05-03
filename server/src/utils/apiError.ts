export class ApiError extends Error {
  public success: boolean;
  public statusCode: number;
  public errors?: string[];
  public timestamp: string;

  constructor(statusCode: number, message?: string, errors?: string[]) {
    const defaultMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      409: "Conflict",
      422: "Unprocessable Entity",
      500: "Internal Server Error",
    };

    super(message || defaultMessages[statusCode] || "Error");

    this.success = false;
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, ApiError.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // convert to JSON
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
