import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError.js';
import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Global error handling middleware
 * Transforms all errors into consistent JSON responses
 */
export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(err);
  
  // Default to 500 internal server error
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: string[] | undefined;
  
  // If error is an ApiError, use its properties
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else {
    // For other errors, create a generic message
    message = err.message || 'Internal Server Error';
    errors = [err.name || 'Error'];
  }
  
  // Send JSON response with proper status code
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};