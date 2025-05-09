import { UserRole } from "@api/user/user.dto.js";
import { ApiError } from "@utils/apiError.js";
import { asyncHandler } from "@utils/asyncHandler.js";
import { NextFunction, Request, Response } from "express";

/**
 * Middleware to restrict access based on user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const restrictTo = (allowedRoles: UserRole[]) => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    // For all other routes, verify authentication
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Authentication required" }]);
    }

    // Check if user role is in allowed roles
    const userRole = req.user.role as UserRole;

    if (
      !allowedRoles.includes(userRole) &&
      !allowedRoles.includes(UserRole.ADMIN)
    ) {
      throw new ApiError(
        403,
        [{ authorization: `Access denied. Required role: ${allowedRoles.join(" or ")}` }]
      );
    }

    next();
  });
};
