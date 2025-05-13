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

const cookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  maxAge: jwtTimeToMs(REFRESH_TOKEN_EXPIRY),
};

declare global {
  namespace Express {
    interface Request {
      user?: UserResponseDTO;
    }
  }
}

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
      const sessionId =
        req.cookies?.sessionId || req.body?.sessionId || "";

      const user = await userService.getUserById(decoded.id, {
        includeRefreshTokens: true,
        deletedAt: false,
      });

      console.log("User from DB:", user);
      console.log("Decoded JWT:", decoded);
      console.log("Refresh Token from Cookies:", refreshToken);
      console.log("Session ID from Cookies:", sessionId);
      console.log("User Refresh Tokens:", user?.refreshTokens);
      console.log("User Refresh Tokens Match:", user?.refreshTokens?.some(
        (t) => t.token === refreshToken && t.id === sessionId
      ));

      if (!user) {
        throw new ApiError(401, [{ user: "User not found. Please login again." }]);
      }

      const matched = user.refreshTokens?.some(
        (t) => t.token === refreshToken && t.id === sessionId
      );

      if (!matched) {
        clearAuthCookies(res);
        throw new ApiError(401, [{ session: "Session expired. Please login again." }]);
      }

      req.user = user as UserResponseDTO;
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

function clearAuthCookies(res: Response): void {
  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("sessionId", cookieOptions);
}
