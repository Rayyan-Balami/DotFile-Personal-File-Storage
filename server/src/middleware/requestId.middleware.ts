import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
/**
 * Middleware that adds a unique request ID to each request
 * The ID is stored in req.requestId and also added as a response header
 */
export const addRequestId = (req: Request, res: Response, next: NextFunction): void => {
  // Generate a unique ID using UUID v4
  const requestId = randomUUID();
  
  // Add to request object for use in other middlewares and routes
  req.requestId = requestId;
  
  // Set as response header so client can reference it
  res.setHeader("X-Request-ID", requestId);
  
  next();
};
