import { UserRole } from "@api/user/user.dto.js";
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";
import { NextFunction, Request, Response } from "express";

// Restrict route access to specific user roles
export const restrictTo = (allowedRoles: UserRole[]) =>
  asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Authentication required" }]);
    }

    const userRole = req.user.role as UserRole;

    // Allow access if user's role is in the allowed list
    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(
        403,
        [{ authorization: `Access denied. Required role: ${allowedRoles.join(" or ")}` }]
      );
    }

    next();
  });
