import { PublicShare, UserShare, IPublicShare, IUserShare } from "./share.model.js";
import mongoose from "mongoose";
import { IUserSharePermission, IPublicSharePermission } from "./share.dto.js";

class ShareDao {
  // Public Share methods
  async createPublicShare(shareData: Partial<IPublicShare>): Promise<IPublicShare> {
    const publicShare = new PublicShare(shareData);
    return await publicShare.save();
  }

  async getPublicShareByResource(resourceId: string): Promise<IPublicShare | null> {
    return await PublicShare.findOne({ resource: new mongoose.Types.ObjectId(resourceId) });
  }

  async getPublicShareByLink(link: string): Promise<IPublicShare | null> {
    return await PublicShare.findOne({ link });
  }

  async updatePublicShare(
    shareId: string,
    updateData: Partial<IPublicShare>
  ): Promise<IPublicShare | null> {
    return await PublicShare.findByIdAndUpdate(shareId, updateData, { new: true });
  }

  async deletePublicShare(resourceId: string): Promise<IPublicShare | null> {
    return await PublicShare.findOneAndDelete({ 
      resource: new mongoose.Types.ObjectId(resourceId) 
    });
  }

  // User Share methods
  async createUserShare(shareData: {
    resource: mongoose.Types.ObjectId;
    owner: mongoose.Types.ObjectId;
    sharedWith: Array<{
      userId: mongoose.Types.ObjectId;
      permission: IUserSharePermission;
      allowDownload: boolean;
    }>;
  }): Promise<IUserShare> {
    const userShare = new UserShare(shareData);
    return await userShare.save();
  }

  async getUserShareByResource(resourceId: string): Promise<IUserShare | null> {
    return await UserShare.findOne({ 
      resource: new mongoose.Types.ObjectId(resourceId) 
    }).populate({
      path: 'sharedWith.userId',
      select: 'name email avatar'
    });
  }

  async updateUserShare(
    resourceId: string,
    updateData: Partial<IUserShare>
  ): Promise<IUserShare | null> {
    return await UserShare.findOneAndUpdate(
      { resource: new mongoose.Types.ObjectId(resourceId) },
      updateData,
      { new: true }
    ).populate({
      path: 'sharedWith.userId',
      select: 'name email avatar'
    });
  }

  async deleteUserShare(resourceId: string): Promise<IUserShare | null> {
    return await UserShare.findOneAndDelete({ 
      resource: new mongoose.Types.ObjectId(resourceId) 
    });
  }

  async addUserToSharedResource(
    resourceId: string, 
    ownerId: string,
    userId: string, 
    permission: IUserSharePermission,
    allowDownload: boolean = false
  ): Promise<IUserShare | null> {
    // Check if user share exists for this resource
    let userShare = await UserShare.findOne({ 
      resource: new mongoose.Types.ObjectId(resourceId),
      owner: new mongoose.Types.ObjectId(ownerId) 
    });

    if (!userShare) {
      // Create new user share if it doesn't exist
      // Create a proper document using the model constructor
      userShare = new UserShare({
        resource: new mongoose.Types.ObjectId(resourceId),
        owner: new mongoose.Types.ObjectId(ownerId),
        sharedWith: [{
          userId: new mongoose.Types.ObjectId(userId),
          permission,
          allowDownload
        }]
      });
      await userShare.save();
    } else {
      // Check if user is already in the shared list
      const existingUserIndex = userShare.sharedWith.findIndex(
        share => share.userId.toString() === userId
      );

      if (existingUserIndex >= 0) {
        // Update existing user permission
        userShare.sharedWith[existingUserIndex].permission = permission;
        userShare.sharedWith[existingUserIndex].allowDownload = allowDownload;
      } else {
        // Add new user to share list
        // Using direct manipulation with type assertion to bypass TypeScript restrictions
        // while keeping the runtime behavior correct
        userShare.sharedWith.push({
          userId: new mongoose.Types.ObjectId(userId),
          permission,
          allowDownload
        } as any);
      }

      await userShare.save();
    }

    return userShare ? userShare.populate({
      path: 'sharedWith.userId',
      select: 'name email avatar'
    }) : null;
  }

  async removeUserFromSharedResource(
    resourceId: string, 
    userId: string
  ): Promise<IUserShare | null> {
    const userShare = await UserShare.findOne({ 
      resource: new mongoose.Types.ObjectId(resourceId) 
    });

    if (!userShare) return null;

    // Filter out the user from the shared list
    userShare.sharedWith = userShare.sharedWith.filter(
      share => share.userId.toString() !== userId
    );

    // If no users left, delete the share document
    if (userShare.sharedWith.length === 0) {
      return await UserShare.findByIdAndDelete(userShare._id);
    }

    // Otherwise save the updated share
    return await userShare.save();
  }

  async getResourcesSharedWithUser(userId: string): Promise<IUserShare[]> {
    return await UserShare.find({
      'sharedWith.userId': new mongoose.Types.ObjectId(userId)
    })
    .populate({
      path: 'resource',
      select: 'name type path owner'
    })
    .populate({
      path: 'owner',
      select: 'name email avatar'
    });
  }

  async getUserPermissionForResource(
    resourceId: string, 
    userId: string
  ): Promise<{ permission: IUserSharePermission; allowDownload: boolean } | null> {
    const userShare = await UserShare.findOne({ 
      resource: new mongoose.Types.ObjectId(resourceId),
      'sharedWith.userId': new mongoose.Types.ObjectId(userId)
    });

    if (!userShare) return null;

    const userPermission = userShare.sharedWith.find(
      share => share.userId.toString() === userId
    );

    return userPermission ? {
      permission: userPermission.permission,
      allowDownload: userPermission.allowDownload
    } : null;
  }

  async getResourcesSharedByUser(userId: string): Promise<
    Array<mongoose.Document & (IPublicShare | IUserShare)>
  > {
    // Find resources the user has shared via public links
    const publicShares = await PublicShare.find({
      owner: new mongoose.Types.ObjectId(userId)
    })
    .populate({
      path: 'resource',
      select: 'name type path owner'
    })
    .populate({
      path: 'owner',
      select: 'name email avatar'
    });
    
    // Find resources the user has shared with specific users
    const userShares = await UserShare.find({
      owner: new mongoose.Types.ObjectId(userId)
    })
    .populate({
      path: 'resource',
      select: 'name type path owner'
    })
    .populate({
      path: 'owner',
      select: 'name email avatar'
    })
    .populate({
      path: 'sharedWith.userId',
      select: 'name email avatar'
    });
    
    // Type assertion to satisfy TypeScript's strict checking
    return [...publicShares, ...userShares] as Array<mongoose.Document & (IPublicShare | IUserShare)>;
  }
}

export default new ShareDao();
