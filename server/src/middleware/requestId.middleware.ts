// Import UUID generator from Node.js crypto module
import { randomUUID } from "crypto";

// Import Express types for strong typing
import { NextFunction, Request, Response } from "express";

// Extend Express Request interface to include custom property: requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string; // Custom property to store unique request ID
    }
  }
}

/**
 * Middleware to add a unique request ID to each incoming request.
 * - Stores the ID in req.requestId
 * - Adds the ID to the response header as 'X-Request-ID'
 */
export const addRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate a new UUID (version 4)
  const requestId = randomUUID();

  // Attach the generated ID to the request object
  req.requestId = requestId;

  // Add the ID to the response headers for traceability
  res.setHeader("X-Request-ID", requestId);

  // Pass control to the next middleware
  next();
};
