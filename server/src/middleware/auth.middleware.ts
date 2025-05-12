import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload, UserResponseDTO } from "@api/user/user.dto.js";
import userService from "@api/user/user.service.js";
import {
  ACCESS_TOKEN_SECRET,
  IS_PRODUCTION,
  REFRESH_TOKEN_EXPIRY,
} from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";
import { jwtTimeToMs } from "@utils/jwtTimeToMs.utils.js";

// Cookie options for clearing
//  case : when user hits logout all / specific device, cookies are not cleared magically in those browsers making them stuck , not even able to logout
// so: in this case we need to clear cookies when user requests form those browsers
// result: user will be starting fresh session
const cookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  maxAge: jwtTimeToMs(REFRESH_TOKEN_EXPIRY),
};

// Type declaration for request object
declare global {
  namespace Express {
    interface Request {
      user?: UserResponseDTO;
    }
  }
}

/**
 * Middleware to verify JWT token and authenticate user
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next function to call the next middleware
 */
export const verifyAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      // Clear cookies if present but no valid token
      clearAuthCookies(res);
      throw new ApiError(401, [{ token: "No token provided" }]);
    }

    try {
      // Type assertion to handle the jwt.verify return type
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;

      // Find the complete user document
      const user = await userService.getUserByIdAndRefreshToken(
        decoded.id,
        req.cookies?.refreshToken || "",
        {
          includeRefreshTokens: true,
          deletedAt: false,
        }
      );

      if (!user) {
        // Clear cookies if user not found or token invalid
        clearAuthCookies(res);
        throw new ApiError(401, [
          { user: "Session expired or invalidated. Please login again." },
        ]);
      }

      // Attach user to request object - ensure user has required id property
      if (!user.id) {
        clearAuthCookies(res);
        throw new ApiError(401, [{ user: "Invalid user data" }]);
      }
      req.user = user as UserResponseDTO;
      next();
    } catch (error) {
      // Clear cookies on any auth error
      clearAuthCookies(res);

      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, [
          { token: "Session expired, please login again" },
        ]);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, [{ token: "Invalid token" }]);
      }
      throw error;
    }
  }
);

/**
 * Helper function to clear all authentication cookies
 *
 * @param res Response object
 */
function clearAuthCookies(res: Response): void {
  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("sessionId", cookieOptions);
}
