import { Response } from "express";
import logger from "./logger.js";

/**
 * Standard API response format
 */
export interface IApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: string;
}

/**
 * HTTP status messages
 */
export const HttpStatusMessages: Record<number, string> = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
};

/**
 * Unified API Response Handler
 */
class ApiResponse<T = any> {
  private res: Response;
  private statusCode: number;
  private message: string;
  private data?: T;
  private errors?: string[];
  private success: boolean;

  constructor(res: Response, success: boolean = true) {
    this.res = res;
    this.success = success;
    this.statusCode = success ? 200 : 500;
    this.message = HttpStatusMessages[this.statusCode] || (success ? "Success" : "Error");
  }

  static success<T = any>(res: Response): ApiResponse<T> {
    return new ApiResponse<T>(res, true);
  }

  static error<T = any>(res: Response): ApiResponse<T> {
    return new ApiResponse<T>(res, false).withStatusCode(500);
  }

  withData(data: T): this {
    this.data = data;
    return this;
  }

  withErrors(errors: string[]): this {
    this.errors = errors;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withStatusCode(statusCode: number): this {
    this.statusCode = statusCode;
    return this;
  }

  send(): Response {
    const response: IApiResponse<T> = {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      timestamp: new Date().toISOString(),
    };

    if (this.data !== undefined) response.data = this.data;
    if (this.errors?.length) response.errors = this.errors;

    const logFn = this.success ? logger.log : logger.error;
    logFn(`Response: ${JSON.stringify(response)}`);

    return this.res.status(this.statusCode).json(response);
  }
}

export default ApiResponse;
