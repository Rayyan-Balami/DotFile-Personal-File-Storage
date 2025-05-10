import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "@api/user/user.dto.js";
import { ACCESS_TOKEN_SECRET } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";
import userService from "@api/user/user.service.js";

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
      // First verify if the token is valid JWT
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;
      
      if (decoded?.id) {
        // Token is valid, now check if user session is valid
        const refreshToken = req.cookies?.refreshToken || "";
        try {
          const user = await userService.getUserByIdAndRefreshToken(
            decoded.id,
            refreshToken,
            { includeRefreshTokens: true, deletedAt: false }
          );
          
          // Only block access if we find a valid user with this token
          if (user) {
            throw new ApiError(403, [{ auth: "Already authenticated" }]);
          }
        } catch (userError) {
          // User not found or token not valid in database
          // Allow access as this means the token is stale
          return next();
        }
      }
      
      // If we reach here, token was valid but user wasn't found
      return next();
    } catch (err) {
      // Any JWT verification error means token is invalid
      // This includes expired tokens, invalid signatures, etc.
      if (err instanceof jwt.JsonWebTokenError || 
          err instanceof jwt.TokenExpiredError ||
          err instanceof jwt.NotBeforeError) {
        // Invalid token = treat as guest
        return next();
      }
      
      if (err instanceof ApiError) {
        throw err; // Re-throw our "already authenticated" error
      }
      
      // Any other error, allow access as guest
      return next();
    }
  }
);
