import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload, UserResponseDTO } from "../api/user/user.dto.js";
import userService from "../api/user/user.service.js";
import { ACCESS_TOKEN_SECRET } from "../constants.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Type declaration for request object
declare global {
  namespace Express {
    interface Request {
      user?: UserResponseDTO;
    }
  }
}

export const verifyJwt = asyncHandler(
  async (req: Request, _: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "No token provided", ["token"]);
    }

    try {
      // Type assertion to handle the jwt.verify return type
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;

      // Find the complete user document
      const user = await userService.getUserById(decoded.id);

      if (!user) {
        throw new ApiError(401, "Invalid token or user not found", ["user"]);
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "Session expired, please login again", [
          "token",
        ]);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, "Invalid token", ["token"]);
      }
      throw new ApiError(401, "Unauthorized", ["token"]);
    }
  }
);
