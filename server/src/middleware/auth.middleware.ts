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
      throw new ApiError(401, [{ token: "No token provided" }]);
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || "";

      // Check if the user exists in the database
      const user = await userService.getUserById(decoded.id);
      if (!user) {
        throw new ApiError(401, [
          { user: "User not found. Please login again." },
        ]);
      }
      // Check if the refresh token is valid
      const userWithRefreshToken = await userService.getUserByIdAndRefreshToken(
        user.id,
        refreshToken,
        { includeRefreshTokens: true, deletedAt: false }
      );
      if (!userWithRefreshToken) {
        // Only clear cookies if user is not found
        clearAuthCookies(res);
        throw new ApiError(401, [
          { user: "Session expired. Please login again." },
        ]);
      }

      // Attach authenticated user to request
      req.user = user as UserResponseDTO;
      next();
    } catch (error) {
      // Do not clear cookies unless user is not found

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
