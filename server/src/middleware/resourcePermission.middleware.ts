import { Request, Response, NextFunction } from "express";
import { ApiError } from "@utils/apiError.utils.js";
import shareService from "@api/share/share.service.js";
import { IUserSharePermission, IPublicSharePermission } from "@api/share/share.dto.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";

// Type declaration for extending request object with permissionInfo
declare global {
  namespace Express {
    interface Request {
      body: {
        permissionInfo?: {
          hasPermission: boolean;
          isOwner: boolean;
          permissionLevel?: IUserSharePermission | IPublicSharePermission;
          allowDownload?: boolean;
        } & Record<string, any>;
        [key: string]: any;
      };
    }
  }
}

/**
 * Middleware to verify user permissions for a resource
 * 
 * @param resourceType The type of resource ('file' or 'folder')
 * @param permissionLevel The required permission level
 * @returns Express middleware function
 */
export const verifyResourcePermission = (
  resourceType: 'file' | 'folder',
  permissionLevel?: IUserSharePermission | IPublicSharePermission
) => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    // Extract resource ID from params using a consistent pattern
    const resourceId = req.params.id || req.params.fileId || req.params.folderId || req.params.resourceId;
    const userId = req.user?._id;
    
    if (!resourceId) {
      throw new ApiError(400, [{ resource: "Resource ID is required" }]);
    }

    if (!userId) {
      throw new ApiError(401, [{ auth: "User not authenticated" }]);
    }

    try {
      // Get the resource to check its owner
      let resource, resourceOwnerId;
      
      // Import and use the appropriate service based on resource type
      if (resourceType === 'file') {
        const fileService = await import('@api/File/file.service.js')
          .then(module => module.default);
        resource = await fileService.getFileById(resourceId, userId);
      } else {
        const folderService = await import('@api/Folder/folder.service.js')
          .then(module => module.default);
        resource = await folderService.getFolderById(resourceId, userId, false);
      }

      if (!resource) {
        throw new ApiError(404, [{ resource: `${resourceType} not found` }]);
      }

      resourceOwnerId = resource.owner.toString();
      
      // Verify user's permission
      const permissionResult = await shareService.verifyPermission(
        resourceId,
        userId,
        resourceOwnerId,
        permissionLevel
      );

      if (!permissionResult.hasPermission) {
        throw new ApiError(403, [
          { permission: "You do not have sufficient permissions for this action" }
        ]);
      }

      // Add permission info to request for potential use in route handlers
      req.body.permissionInfo = permissionResult;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, [{ server: "Error verifying resource permissions" }]);
    }
  });
};

/**
 * Middleware to verify resource ownership only (no shared permissions)
 * Useful for operations that only owners should perform (like sharing)
 * 
 * @param resourceType The type of resource ('file' or 'folder')
 * @returns Express middleware function
 */
export const verifyResourceOwnership = (resourceType: 'file' | 'folder') => {
  return asyncHandler(async (req: Request, _: Response, next: NextFunction) => {
    // Extract resource ID from params using a consistent pattern
    const resourceId = req.params.id || req.params.fileId || req.params.folderId || req.params.resourceId;
    const userId = req.user?._id;
    
    if (!resourceId) {
      throw new ApiError(400, [{ resource: "Resource ID is required" }]);
    }

    if (!userId) {
      throw new ApiError(401, [{ auth: "User not authenticated" }]);
    }

    try {
      // Get the resource to check its owner
      let resource;
      
      // Import and use the appropriate service based on resource type
      if (resourceType === 'file') {
        const fileService = await import('@api/File/file.service.js')
          .then(module => module.default);
        resource = await fileService.getFileById(resourceId, userId);
      } else {
        const folderService = await import('@api/Folder/folder.service.js')
          .then(module => module.default);
        resource = await folderService.getFolderById(resourceId, userId, false);
      }

      if (!resource) {
        throw new ApiError(404, [{ resource: `${resourceType} not found` }]);
      }

      // Check if user is the owner
      if (resource.owner.toString() !== userId) {
        throw new ApiError(403, [
          { authorization: `You must be the owner of this ${resourceType} to perform this action` }
        ]);
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, [{ server: "Error verifying resource ownership" }]);
    }
  });
};
