import { NextFunction, Request, Response } from "express";
import { ApiError } from "@utils/apiError.js"; // Adjust path as needed
import logger from "@utils/logger.js";

/**
 * Wrapper for async route handlers to handle promise rejections
 * This eliminates the need for try/catch blocks in every controller
 *
 * @param fn The async route handler function
 * @returns A function that handles the request and catches any errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error(error as Error);

      if (res.headersSent) {
        return next(error);
      }

      // If error is already an ApiError, pass it along
      if (error instanceof ApiError) {
        return next(error);
      }

      // Wrap unknown errors in ApiError with status 500
      const apiError = new ApiError(
        500,
        [{ error: error instanceof Error ? error.message : "Unknown error" }]
      );

      return next(apiError);
    }
  };
};

export default asyncHandler;
