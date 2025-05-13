import shareDao from "./share.dao.js";
import { ApiError } from "@utils/apiError.utils.js";
import { IUserSharePermission, IPublicSharePermission } from "./share.dto.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import { IPublicShare, IUserShare } from "./share.model.js";
import crypto from "crypto";
import mongoose, { Document } from "mongoose";

// Response types
interface PublicShareResponseDto extends Omit<IPublicShare, keyof Document> {}
interface UserShareResponseDto extends Omit<IUserShare, keyof Document> {}

// Permission verification types
export interface PermissionVerificationResult {
  hasPermission: boolean;
  isOwner: boolean;
  permissionLevel?: IUserSharePermission | IPublicSharePermission;
  allowDownload?: boolean;
}

class ShareService {
  // Public Share Methods
  async createPublicShare(
    resourceId: string,
    ownerId: string,
    permission: IPublicSharePermission = IPublicSharePermission.RESTRICTED,
    allowDownload: boolean = false,
    resourceType: string = 'file'
  ): Promise<PublicShareResponseDto> {
    // Check if a public share already exists for this resource
    const existingShare = await shareDao.getPublicShareByResource(resourceId);
    if (existingShare) {
      throw new ApiError(409, [{ share: "Public share already exists for this resource" }]);
    }

    // Generate a unique link token
    const link = this.generateShareLink();

    // Determine resource model based on type
    const resourceModel = resourceType === 'folder' ? 'Folder' : 'File';

    // Create the public share 
    // Using type assertion to bypass TypeScript strictness while maintaining runtime correctness
    const shareData = {
      resource: resourceId,
      resourceModel,
      owner: ownerId,
      link,
      permission,
      allowDownload
    };

    const newShare = await shareDao.createPublicShare(shareData as any);
    
    // Update the resource with the share reference
    await this.updateResourceWithShareReference(
      resourceId, 
      newShare._id.toString(), 
      'public'
    );
    
    return this.sanitizePublicShare(newShare);
  }

  async getPublicShareByLink(link: string): Promise<PublicShareResponseDto | null> {
    const share = await shareDao.getPublicShareByLink(link);
    return share ? this.sanitizePublicShare(share) : null;
  }

  async getPublicShareByResource(
    resourceId: string,
    userId: string
  ): Promise<PublicShareResponseDto | null> {
    const share = await shareDao.getPublicShareByResource(resourceId);
    
    // Verify the user is the owner
    if (share && share.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You don't have permission to access this share" }
      ]);
    }
    
    return share ? this.sanitizePublicShare(share) : null;
  }

  async updatePublicShare(
    resourceId: string,
    userId: string,
    updateData: {
      permission?: IPublicSharePermission;
      allowDownload?: boolean;
    }
  ): Promise<PublicShareResponseDto | null> {
    // Get the existing share
    const existingShare = await shareDao.getPublicShareByResource(resourceId);
    
    if (!existingShare) {
      throw new ApiError(404, [{ share: "Public share not found" }]);
    }
    
    // Verify the user is the owner
    if (existingShare.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You don't have permission to update this share" }
      ]);
    }
    
    // Update the share
    const updatedShare = await shareDao.updatePublicShare(
      existingShare._id.toString(), 
      updateData
    );
    
    return updatedShare ? this.sanitizePublicShare(updatedShare) : null;
  }

  async deletePublicShare(
    resourceId: string,
    userId: string
  ): Promise<PublicShareResponseDto | null> {
    // Get the existing share
    const existingShare = await shareDao.getPublicShareByResource(resourceId);
    
    if (!existingShare) {
      throw new ApiError(404, [{ share: "Public share not found" }]);
    }
    
    // Verify the user is the owner
    if (existingShare.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You don't have permission to delete this share" }
      ]);
    }
    
    // Delete the share
    const deletedShare = await shareDao.deletePublicShare(resourceId);
    
    if (deletedShare) {
      try {
        // Clear the reference from the resource
        const fileDao = (await import('@api/File/file.dao.js')).default;
        const folderDao = (await import('@api/Folder/folder.dao.js')).default;
        
        await fileDao.updateFile(resourceId, { publicShare: null });
        await folderDao.updateFolder(resourceId, { publicShare: null });
      } catch (error) {
        console.error('Error clearing public share reference:', error);
      }
    }
    
    return deletedShare ? this.sanitizePublicShare(deletedShare) : null;
  }

  // User Share Methods
  async addUserToSharedResource(
    resourceId: string,
    ownerId: string,
    targetUserId: string,
    permission: IUserSharePermission = IUserSharePermission.VIEWER,
    allowDownload: boolean = false,
    resourceType: string = 'file'
  ): Promise<UserShareResponseDto | null> {
    // Ensure the owner is not trying to share with themselves
    if (ownerId === targetUserId) {
      throw new ApiError(400, [{ share: "Cannot share resource with yourself" }]);
    }
    
    // Determine resource model based on type
    const resourceModel = resourceType === 'folder' ? 'Folder' : 'File';

    const userShare = await shareDao.addUserToSharedResource(
      resourceId,
      ownerId,
      targetUserId,
      permission,
      allowDownload,
      resourceModel
    );
    
    if (userShare) {
      // Update the resource with the share reference
      await this.updateResourceWithShareReference(
        resourceId, 
        userShare._id.toString(), 
        'user'
      );
    }

    return userShare ? this.sanitizeUserShare(userShare) : null;
  }

  async getUserShareByResource(
    resourceId: string,
    userId: string
  ): Promise<UserShareResponseDto | null> {
    const share = await shareDao.getUserShareByResource(resourceId);
    
    // Verify the user is the owner
    if (share && share.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You don't have permission to access this share" }
      ]);
    }
    
    return share ? this.sanitizeUserShare(share) : null;
  }

  async removeUserFromSharedResource(
    resourceId: string,
    ownerId: string,
    targetUserId: string
  ): Promise<UserShareResponseDto | null> {
    // Get the existing share
    const existingShare = await shareDao.getUserShareByResource(resourceId);
    
    if (!existingShare) {
      throw new ApiError(404, [{ share: "User share not found" }]);
    }
    
    // Verify the user is the owner
    if (existingShare.owner.toString() !== ownerId) {
      throw new ApiError(403, [
        { authorization: "You don't have permission to update this share" }
      ]);
    }

    // Remove the target user
    const updatedShare = await shareDao.removeUserFromSharedResource(
      resourceId,
      targetUserId
    );
    
    // If no share is returned, it means the share was deleted
    // because there are no more users shared with
    if (!updatedShare) {
      try {
        // Clear the reference from the resource
        const fileDao = (await import('@api/File/file.dao.js')).default;
        const folderDao = (await import('@api/Folder/folder.dao.js')).default;
        
        await fileDao.updateFile(resourceId, { userShare: null });
        await folderDao.updateFolder(resourceId, { userShare: null });
      } catch (error) {
        console.error('Error clearing user share reference:', error);
      }
    }
    
    return updatedShare ? this.sanitizeUserShare(updatedShare) : null;
  }

  async getResourcesSharedWithUser(
    userId: string
  ): Promise<Array<{
    resource: any;
    owner: any;
    permission: IUserSharePermission;
    allowDownload: boolean;
  }>> {
    const shares = await shareDao.getResourcesSharedWithUser(userId);
    
    return shares.flatMap(share => {
      return share.sharedWith
        .filter(sharedItem => sharedItem.userId.toString() === userId)
        .map(sharedItem => ({
          resource: share.resource,
          owner: share.owner,
          permission: sharedItem.permission,
          allowDownload: sharedItem.allowDownload
        }));
    });
  }

  /**
   * Get all resources that a user has shared with others
   * Includes both public shares and user shares
   * 
   * @param userId ID of the user who shared resources
   * @returns Array of shares created by this user
   */
  async getResourcesSharedByUser(
    userId: string
  ): Promise<{
    publicShares: Array<Partial<IPublicShare>>;
    userShares: Array<Partial<IUserShare>>;
  }> {
    const shares = await shareDao.getResourcesSharedByUser(userId);
    
    // Separate the results into public and user shares
    const publicShares = shares
      .filter(share => 'link' in share) // PublicShare has a 'link' property
      .map(share => this.sanitizePublicShare(share as IPublicShare));
    
    const userShares = shares
      .filter(share => 'sharedWith' in share) // UserShare has a 'sharedWith' property
      .map(share => this.sanitizeUserShare(share as IUserShare));
    
    return {
      publicShares,
      userShares
    };
  }

  /**
   * Verifies a user's permission for a resource
   * 
   * @param resourceId The resource to check permissions for
   * @param userId The user requesting access
   * @param resourceOwnerId The ID of the resource owner
   * @param requiredPermission The minimum permission level required for the action
   * @returns Object containing permission details
   */
  async verifyPermission(
    resourceId: string, 
    userId: string,
    resourceOwnerId: string,
    requiredPermission?: IUserSharePermission | IPublicSharePermission
  ): Promise<PermissionVerificationResult> {
    // If user is the owner, they have full permissions
    if (userId === resourceOwnerId) {
      return { 
        hasPermission: true, 
        isOwner: true 
      };
    }

    // Check if resource is shared with this specific user
    const userPermission = await shareDao.getUserPermissionForResource(resourceId, userId);
    
    if (userPermission) {
      // Determine if user has sufficient permission
      let hasPermission = true;
      
      if (requiredPermission) {
        // For user shares, only VIEWER and EDITOR exist
        if (requiredPermission === IUserSharePermission.EDITOR && 
            userPermission.permission !== IUserSharePermission.EDITOR) {
          hasPermission = false;
        }
      }
      
      return { 
        hasPermission,
        isOwner: false, 
        permissionLevel: userPermission.permission,
        allowDownload: userPermission.allowDownload
      };
    }

    // Check public share (for publicly accessible resources)
    const publicShare = await shareDao.getPublicShareByResource(resourceId);
    
    if (publicShare) {
      let hasPermission = true;
      
      if (requiredPermission) {
        // For public shares with different permission levels
        const permissionHierarchy = {
          [IPublicSharePermission.RESTRICTED]: 1,
          [IPublicSharePermission.VIEWER]: 2,
          [IPublicSharePermission.EDITOR]: 3
        };
        
        // Check if required permission is higher than what's granted
        const requiredLevel = permissionHierarchy[requiredPermission as IPublicSharePermission] || 0;
        const grantedLevel = permissionHierarchy[publicShare.permission] || 0;
        
        if (requiredLevel > grantedLevel) {
          hasPermission = false;
        }
      }
      
      return { 
        hasPermission, 
        isOwner: false, 
        permissionLevel: publicShare.permission,
        allowDownload: publicShare.allowDownload
      };
    }

    // No sharing found for this resource and user
    return { 
      hasPermission: false, 
      isOwner: false 
    };
  }

  // Helper methods
  private generateShareLink(): string {
    // Generate a random 16-byte token and convert to hex
    return crypto.randomBytes(16).toString('hex');
  }

  private sanitizePublicShare(share: IPublicShare): PublicShareResponseDto {
    return sanitizeDocument<PublicShareResponseDto>(share, {
      excludeFields: ["__v"],
      recursive: true
    });
  }

  private sanitizeUserShare(share: IUserShare): UserShareResponseDto {
    return sanitizeDocument<UserShareResponseDto>(share, {
      excludeFields: ["__v"],
      recursive: true
    });
  }
  
  /**
   * Update the resource (File or Folder) to include a reference to the created share
   * This makes sure the share information is directly accessible from the resource
   * 
   * @param resourceId ID of the resource (file or folder)
   * @param shareId ID of the share (public or user share)
   * @param shareType Type of share ('public' or 'user')
   */
  async updateResourceWithShareReference(
    resourceId: string,
    shareId: string,
    shareType: 'public' | 'user'
  ): Promise<boolean> {
    try {
      // Dynamically import the DAOs to avoid circular dependencies
      const fileDao = (await import('@api/File/file.dao.js')).default;
      const folderDao = (await import('@api/Folder/folder.dao.js')).default;
      
      // Try to find the resource as a file first
      let file = await fileDao.getFileById(resourceId);
      if (file) {
        // Update the file with the share reference
        const updateData = shareType === 'public' 
          ? { publicShare: shareId } 
          : { userShare: shareId };
        
        await fileDao.updateFile(resourceId, updateData);
        return true;
      }
      
      // If not a file, try as a folder
      let folder = await folderDao.getFolderById(resourceId);
      if (folder) {
        // Update the folder with the share reference
        const updateData = shareType === 'public'
          ? { publicShare: shareId }
          : { userShare: shareId };
        
        await folderDao.updateFolder(resourceId, updateData);
        return true;
      }
      
      // Resource not found
      return false;
    } catch (error) {
      console.error('Error updating resource with share reference:', error);
      return false;
    }
  }
}

export default new ShareService();