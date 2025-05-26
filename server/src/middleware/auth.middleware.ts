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
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Cookie config for secure storage of refresh token
const cookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  maxAge: jwtTimeToMs(REFRESH_TOKEN_EXPIRY),
};

// Extend Express request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserResponseDTO;
    }
  }
}

// Middleware: Verifies access token and user session
export const verifyAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, [{ token: "No token provided" }]);
    }

    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;

      const refreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken || "";

      const user = await userService.getUserById(decoded.id, {
        includeRefreshToken: true,
        deletedAt: false,
      });

      if (!user) {
        throw new ApiError(401, [{ user: "User not found. Please login again." }]);
      }

      if (user.refreshToken !== refreshToken) {
        clearAuthCookies(res);
        throw new ApiError(401, [{ session: "Session expired. Please login again." }]);
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, [{ token: "Session expired, please login again" }]);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, [{ token: "Invalid token" }]);
      }
      throw error;
    }
  }
);

// Clears access and refresh tokens from cookies
function clearAuthCookies(res: Response): void {
  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions);
}
