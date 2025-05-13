import { Request, Response } from "express";
import { asyncHandler } from "@utils/asyncHandler.utils.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import shareService from "./share.service.js";
import folderService from "@api/Folder/folder.service.js";
import fileService from "@api/File/file.service.js";
import { IPublicSharePermission, IUserSharePermission } from "./share.dto.js";

class ShareController {
  // Public Share Controllers
  createPublicShare = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId, resourceType, permission, allowDownload } = req.body;
    const user = req.user;

    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    if (!resourceId || !resourceType) {
      throw new ApiError(400, [{ resource: 'Resource ID and type are required' }]);
    }

    // Verify resource exists and user is the owner
    let resource;
    if (resourceType === 'file') {
      resource = await fileService.getFileById(resourceId, user.id);
    } else if (resourceType === 'folder') {
      resource = await folderService.getFolderById(resourceId, user.id);
    } else {
      throw new ApiError(400, [{ resourceType: 'Invalid resource type' }]);
    }

    if (!resource) {
      throw new ApiError(404, [{ resource: 'Resource not found' }]);
    }

    // Verify ownership
    if (resource.owner.toString() !== user.id) {
      throw new ApiError(403, [{ authorization: 'Only the owner can create shares' }]);
    }

    // Create public share
    const share = await shareService.createPublicShare(
      resourceId,
      user.id,
      permission as IPublicSharePermission,
      allowDownload,
      resourceType
    );

    return res.status(201).json(
      new ApiResponse(201, share, 'Public share created successfully')
    );
  });

  getPublicShare = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const user = req.user;
    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    const share = await shareService.getPublicShareByResource(resourceId, user.id);

    if (!share) {
      throw new ApiError(404, [{ share: 'Public share not found' }]);
    }

    return res.status(200).json(
      new ApiResponse(200, share, 'Public share retrieved successfully')
    );
  });

  updatePublicShare = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const { permission, allowDownload } = req.body;
    const user = req.user;
    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    const share = await shareService.updatePublicShare(
      resourceId,
      user.id,
      { permission, allowDownload }
    );

    return res.status(200).json(
      new ApiResponse(200, share, 'Public share updated successfully')
    );
  });

  deletePublicShare = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const user = req.user;
    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    const share = await shareService.deletePublicShare(resourceId, user.id);

    return res.status(200).json(
      new ApiResponse(200, share, 'Public share deleted successfully')
    );
  });

  // Access shared resource by link
  accessSharedResource = asyncHandler(async (req: Request, res: Response) => {
    const { link } = req.params;

    const share = await shareService.getPublicShareByLink(link);

    if (!share) {
      throw new ApiError(404, [{ share: 'Shared resource not found or link has expired' }]);
    }

    // Get the actual resource
    let resource;
    
    // Determine resource type from resource ID
    try {
      // First try to fetch as file
      resource = await fileService.getFileById(share.resource.toString(), share.owner.toString());
      
      if (!resource) {
        // If not found as file, try as folder
        resource = await folderService.getFolderById(share.resource.toString(), share.owner.toString());
      }
    } catch (error) {
      // Handle errors
    }

    if (!resource) {
      throw new ApiError(404, [{ resource: 'Shared resource no longer exists' }]);
    }

    // Return the resource with share info
    return res.status(200).json(
      new ApiResponse(200, {
        resource,
        shareInfo: {
          permission: share.permission,
          allowDownload: share.allowDownload,
          owner: share.owner
        }
      }, 'Shared resource accessed successfully')
    );
  });

  // User Share Controllers
  shareWithUser = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId, resourceType, targetUserId, permission, allowDownload } = req.body;
    const user = req.user;
    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    if (!resourceId || !resourceType || !targetUserId) {
      throw new ApiError(400, [{ resource: 'Resource ID, type and target user ID are required' }]);
    }

    // Verify resource exists and user is the owner
    let resource;
    if (resourceType === 'file') {
      resource = await fileService.getFileById(resourceId, user.id);
    } else if (resourceType === 'folder') {
      resource = await folderService.getFolderById(resourceId, user.id);
    } else {
      throw new ApiError(400, [{ resourceType: 'Invalid resource type' }]);
    }

    if (!resource) {
      throw new ApiError(404, [{ resource: 'Resource not found' }]);
    }

    // Verify ownership
    if (resource.owner.toString() !== user.id) {
      throw new ApiError(403, [{ authorization: 'Only the owner can share resources' }]);
    }

    // Share with user
    const share = await shareService.addUserToSharedResource(
      resourceId,
      user.id,
      targetUserId,
      permission as IUserSharePermission,
      allowDownload,
      resourceType
    );

    return res.status(201).json(
      new ApiResponse(201, share, 'Resource shared with user successfully')
    );
  });

  getUserShare = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const user = req.user;

    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    const share = await shareService.getUserShareByResource(resourceId, user.id);

    if (!share) {
      throw new ApiError(404, [{ share: 'User share not found' }]);
    }

    return res.status(200).json(
      new ApiResponse(200, share, 'User share retrieved successfully')
    );
  });

  removeUserShare = asyncHandler(async (req: Request, res: Response) => {
    const { resourceId, targetUserId } = req.params;
    const user = req.user;

    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    const share = await shareService.removeUserFromSharedResource(
      resourceId,
      user.id,
      targetUserId
    );

    return res.status(200).json(
      new ApiResponse(200, share, 'User share removed successfully')
    );
  });

  // Get all resources shared with current user
  getMySharedResources = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    // Get raw shared resources first
    const sharedResources = await shareService.getResourcesSharedWithUser(user.id);

    // Process the resources to add file/folder specific data
    const processedResources = await Promise.all(
      sharedResources.map(async (item) => {
        // Base response structure
        const result = {
          resource: item.resource,
          owner: item.owner,
          permission: item.permission,
          allowDownload: item.allowDownload
        };

        // Determine if it's a file or folder and fetch full details
        try {
          if (item.resource.type === 'file') {
            // Get file details
            const fileDetails = await fileService.getFileById(item.resource._id.toString(), user.id);
            result.resource = fileDetails;
          } else if (item.resource.type === 'folder') {
            // Get folder details
            const folderDetails = await folderService.getFolderById(
              item.resource._id.toString(),
              user.id,
            );
            result.resource = folderDetails;
          }
        } catch (error) {
          // If we can't fetch details, just use what we have
          console.error(`Error fetching details for ${item.resource.type} ${item.resource._id}:`, error);
        }

        return result;
      })
    );

    return res.status(200).json(
      new ApiResponse(200, processedResources, 'Shared resources retrieved successfully')
    );
  });
  
  /**
   * Get all resources the current user has shared with others
   */
  getMySharedOutResources = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, [{ auth: 'User not authenticated' }]);
    }

    const sharedResources = await shareService.getResourcesSharedByUser(user.id);

    // Process each share to add full resource information
    const enhancedData = {
      publicShares: await Promise.all(
        sharedResources.publicShares.map(async (share: any) => {
          try {
            // First get resource type from the database
            let resourceType = '';
            let resourceId = '';
            
            if (share.resource) {
              resourceId = share.resource._id ? share.resource._id.toString() : share.resource.toString();
              
              // Try to load the resource first to get its type
              try {
                const fileResult = await fileService.getFileById(resourceId, user.id);
                if (fileResult) resourceType = 'file';
              } catch {
                try {
                  const folderResult = await folderService.getFolderById(resourceId, user.id);
                  if (folderResult) resourceType = 'folder';
                } catch {
                  // Resource might be inaccessible or deleted
                }
              }
            }

            const resourceInfo = await this.getResourceInfo(resourceId, resourceType, user.id);
            return { ...share, resourceInfo };
          } catch (error) {
            return share;
          }
        })
      ),
      userShares: await Promise.all(
        sharedResources.userShares.map(async (share: any) => {
          try {
            // First get resource type from the database
            let resourceType = '';
            let resourceId = '';
            
            if (share.resource) {
              resourceId = share.resource._id ? share.resource._id.toString() : share.resource.toString();
              
              // Try to load the resource first to get its type
              try {
                const fileResult = await fileService.getFileById(resourceId, user.id);
                if (fileResult) resourceType = 'file';
              } catch {
                try {
                  const folderResult = await folderService.getFolderById(resourceId, user.id);
                  if (folderResult) resourceType = 'folder';
                } catch {
                  // Resource might be inaccessible or deleted
                }
              }
            }

            const resourceInfo = await this.getResourceInfo(resourceId, resourceType, user.id);
            return { ...share, resourceInfo };
          } catch (error) {
            return share;
          }
        })
      )
    };

    return res.status(200).json(
      new ApiResponse(200, enhancedData, 'Resources shared by you retrieved successfully')
    );
  });
  
  /**
   * Helper method to get file or folder details
   */
  private async getResourceInfo(
    resourceId: string,
    resourceType: string,
    userId: string
  ) {
    if (resourceType === 'file') {
      return await fileService.getFileById(resourceId, userId);
    } else if (resourceType === 'folder') {
      return await folderService.getFolderById(resourceId, userId);
    }
    return null;
  }
}

export default new ShareController();
