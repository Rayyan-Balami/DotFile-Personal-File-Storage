import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../api/user/user.dto.js";
import { ACCESS_TOKEN_SECRET } from "../constants.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to check if the user is a guest (not logged in)
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Next function to call the next middleware
 */
export const verifyGuest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return next(); // no token = user is not logged in = allow
    }

    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;
      if (decoded?.id) {
        throw new ApiError(403, "Already authenticated", ["auth"]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        throw err; // Re-throw our custom API error
      }
      return next(); // Invalid token, still allow register/login
    }

    next();
  }
);
