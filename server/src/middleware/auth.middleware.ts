import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload, UserResponseDTO } from "@api/user/user.dto.js";
import userService from "@api/user/user.service.js";
import { ACCESS_TOKEN_SECRET } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";

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
  async (req: Request, _: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
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
        throw new ApiError(401, [{ user: "Invalid token or user not found" }]);
      }

      // Attach user to request object - ensure user has required id property
      if (!user.id) {
        throw new ApiError(401, [{ user: "Invalid user data" }]);
      }
      req.user = user as UserResponseDTO;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, [
          { token: "Session expired, please login again" },
        ]);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, [{ token: "Invalid token" }]);
      }
      throw new ApiError(401, [{ token: "Unauthorized" }]);
    }
  }
);
