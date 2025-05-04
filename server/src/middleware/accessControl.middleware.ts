import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { AccessLevel } from "../api/storage/storage.dto.js";
import Storage from "../api/storage/storage.model.js";
import { UserRole } from "../api/user/user.dto.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to restrict access based on user roles
 * 
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export const restrictTo = (allowedRoles: UserRole[]) => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    // For all other routes, verify authentication
    if (!req.user) {
      throw new ApiError(401, "Authentication required", ["authentication"]);
    }

    // Check if user role is in allowed roles
    const userRole = req.user.role as UserRole;
    
    if (!allowedRoles.includes(userRole) && !allowedRoles.includes(UserRole.ADMIN)) {
      throw new ApiError(
        403, 
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        ["authorization"]
      );
    }

    next();
  });
};

/**
 * Middleware to check if user has access to a storage item
 * 
 * @param requiredAccess Minimum access level required (view, edit, owner)
 */
export const checkStorageAccess = (requiredAccess: AccessLevel = AccessLevel.VIEW) => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required", ["authentication"]);
    }

    // Get storage item ID from request params
    const storageId = req.params.id;
    if (!storageId || !Types.ObjectId.isValid(storageId)) {
      throw new ApiError(400, "Invalid storage item ID", ["id"]);
    }

    // Get storage item
    const storageItem = await Storage.findOne({ 
      _id: storageId,
      deletedAt: null
    });

    if (!storageItem) {
      throw new ApiError(404, "Storage item not found", ["storage"]);
    }

    // Admin has full access to all storage items
    if (req.user.role === UserRole.ADMIN) {
      req.storageItem = storageItem;
      return next();
    }

    // Check if user is the owner
    if (storageItem.owner.toString() === req.user.id) {
      req.storageItem = storageItem;
      return next();
    }

    // Check if user has shared access
    const userSharedAccess = storageItem.sharedUsers.find(
      (shared) => shared.userId.toString() === req.user?.id
    );

    if (!userSharedAccess) {
      throw new ApiError(403, "You don't have access to this item", ["authorization"]);
    }

    // Check if user has sufficient access level
    const accessMap = {
      [AccessLevel.VIEW]: 1,
      [AccessLevel.EDIT]: 2,
      [AccessLevel.OWNER]: 3
    };

    if (accessMap[userSharedAccess.accessLevel] < accessMap[requiredAccess]) {
      throw new ApiError(
        403,
        `You need ${requiredAccess} access to perform this action`,
        ["authorization"]
      );
    }

    // Attach storage item to request for controllers to use
    req.storageItem = storageItem;
    next();
  });
};

// Extend Express Request type to include storageItem
declare global {
  namespace Express {
    interface Request {
      storageItem?: any;
    }
  }
}