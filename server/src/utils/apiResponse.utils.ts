export class ApiResponse {
  public success: boolean;
  public statusCode: number;
  public message: string;
  public data?: any;
  public timestamp: string;

  constructor(statusCode: number, data?: any, message?: string) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message || (this.success ? "Success" : "Something went wrong");
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}
