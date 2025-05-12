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

    // If no token, user is definitely a guest
    if (!token) {
      return next();
    }

    try {
      // Try to verify the token
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;
      
      if (decoded?.id) {
        // Get refresh token from cookies or request body
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || "";
        
        try {
          // Check if this is a valid user with a valid session
          const user = await userService.getUserByIdAndRefreshToken(
            decoded.id,
            refreshToken,
            { includeRefreshTokens: true, deletedAt: false }
          );
          
          // If we found a valid user with this token combination, deny access
          if (user) {
            throw new ApiError(403, [{ auth: "Already authenticated. Please logout first." }]);
          }
        } catch (userError) {
          // If the error is our own ApiError, rethrow it
          if (userError instanceof ApiError) {
            throw userError;
          }
          // Otherwise, user not found or token not valid in database
          // Allow access as this means the token is stale
          return next();
        }
      }
      
      // If we reach here, token was valid but user wasn't found
      return next();
    } catch (err) {
      // Handle specific JWT errors
      if (err instanceof jwt.JsonWebTokenError || 
          err instanceof jwt.TokenExpiredError ||
          err instanceof jwt.NotBeforeError) {
        // Invalid token = treat as guest
        return next();
      }
      
      // Rethrow our own errors
      if (err instanceof ApiError) {
        throw err;
      }
      
      // Any other unexpected error, allow access as guest
      return next();
    }
  }
);
