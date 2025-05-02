import { Request, Response, NextFunction } from "express";
import ApiResponseUtil from "./apiResponse.js";
import logger from "./logger.js";

/**
 * Wrapper for async route handlers to handle promise rejections
 * This eliminates the need for try/catch blocks in every controller
 *
 * @param fn The async route handler function
 * @returns A function that handles the request and catches any errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next?: NextFunction) => Promise<any>
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Execute the handler function
      await fn(req, res, next);
    } catch (error) {
      // Log the error
      logger.error(error as Error);

      // If headers already sent, pass to next middleware
      if (res.headersSent) {
        return next(error);
      }

      // Send standardized error response
      ApiResponseUtil.error(res)
        .withStatusCode(500)
        .withMessage("Internal Server Error")
        .withErrors([error instanceof Error ? error.message : "Unknown error"])
        .send();
    }
  };
};

export default asyncHandler;
