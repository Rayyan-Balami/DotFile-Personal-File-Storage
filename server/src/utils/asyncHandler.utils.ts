import { ApiError } from "@utils/apiError.utils.js"; // Adjust path as needed
import logger from "@utils/logger.utils.js";
import { NextFunction, Request, Response } from "express";

/**
 * Wraps async route handlers to catch errors and pass them to Express error middleware.
 * Avoids repetitive try/catch in each controller function.
 *
 * @param fn Async route handler function (req, res, next) => Promise<any>
 * @returns Wrapped function with error handling
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
      // Log error details for debugging
      logger.error(error as Error);

      // Skip handling if response already started
      if (res.headersSent) {
        return next(error);
      }

      // Pass through if error is already formatted ApiError
      if (error instanceof ApiError) {
        return next(error);
      }

      // Wrap unknown errors as ApiError with status 500 (Internal Server Error)
      const apiError = new ApiError(500, [
        { error: error instanceof Error ? error.message : "Unknown error" },
      ]);

      return next(apiError);
    }
  };
};

export default asyncHandler;
