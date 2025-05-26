import { ApiError } from '@utils/apiError.utils.js';
import logger from '@utils/logger.utils.js';
import { NextFunction, Request, Response } from 'express';

/**
 * Middleware: Global error handler
 * Catches and formats thrown errors into standardized API responses
 */
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error("Error handler caught:", err);

  // Skip response if already sent
  if (res.headersSent) {
    logger.warn("Headers already sent, can't send error response");
    return;
  }

  // Default response structure
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: Record<string, string>[] | undefined;

  // Handle known (custom) ApiErrors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else {
    // Handle unknown (generic) errors
    message = err.message || 'Internal Server Error';
    errors = [{ error: err.name || 'Error' }];
  }

  // Send formatted error response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};
