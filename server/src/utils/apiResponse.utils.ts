/**
 * Standard API response format for success or error responses.
 */
export class ApiResponse {
  public success: boolean;
  public statusCode: number;
  public message: string;
  public data?: any; // Optional payload
  public timestamp: string;

  /**
   * Create an ApiResponse instance.
   * @param statusCode HTTP status code (e.g., 200, 404)
   * @param data Optional response data payload
   * @param message Optional custom message; defaults to generic success/failure
   */
  constructor(statusCode: number, data?: any, message?: string) {
    // Success if status code is in 200-299 range
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    // Use provided message or default based on success
    this.message =
      message || (this.success ? "Success" : "Something went wrong");
    this.data = data;
    this.timestamp = new Date().toISOString(); // Response creation time
  }
}
