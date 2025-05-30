import { JwtUserPayload } from "@api/user/user.dto.js";
import userService from "@api/user/user.service.js";
import { ACCESS_TOKEN_SECRET } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

/**
 * Middleware: Allows only unauthenticated (guest) users
 * Blocks users with valid sessions (prevents double login, etc.)
 */
export const verifyGuest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    // No token = allow guest access
    if (!token) return next();

    try {
      // Decode token
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;

      const refreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken || "";

      // Fetch user session
      try {
        const user = await userService.getUserById(decoded.id, {
          includeRefreshToken: true,
          deletedAt: false,
        });

        // If valid session exists, reject guest route access
        if (user?.refreshToken === refreshToken) {
          throw new ApiError(403, [
            { auth: "Already authenticated. Please logout first." },
          ]);
        }
      } catch (error) {
        // If user not found, allow access (token might be old/invalid)
        if (error instanceof ApiError && error.statusCode === 404) {
          return next();
        }
        throw error;
      }

      // Token exists but session mismatch — allow as guest
      return next();
    } catch (err) {
      // Allow guest access on all JWT errors
      if (
        err instanceof jwt.TokenExpiredError ||
        err instanceof jwt.JsonWebTokenError ||
        err instanceof jwt.NotBeforeError
      ) {
        return next();
      }

      // Known application error — rethrow
      if (err instanceof ApiError) throw err;

      // Unknown error — fail open (allow guest access)
      return next();
    }
  }
);
