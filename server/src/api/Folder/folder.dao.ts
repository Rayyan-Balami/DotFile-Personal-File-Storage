import {
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto,
} from "@api/folder/folder.dto.js";
import { Folder, IFolder } from "@api/folder/folder.model.js";
import mongoose, { Types } from "mongoose";

// FolderDao: Data access for folder CRUD, soft-delete, and hierarchy ops
class FolderDao {
  /**
   * Create and save a new folder
   * @param folderData - Partial folder fields (name, parent, owner, etc.)
   * @returns The created folder doc
   */
  async createFolder(folderData: Partial<IFolder>): Promise<IFolder> {
    const newFolder = new Folder(folderData);
    return newFolder.save();
  }

  /**
   * Get user's folders, filter by parent and deleted status
   * @param userId - Folder owner
   * @param parentId - Parent folder (null=root)
   * @param includeDeleted - Include deleted folders if true
   * @returns Folder docs array
   */
  async getUserFolders(
    userId: string,
    parentId?: string | null,
    includeDeleted?: boolean
  ): Promise<IFolder[]> {
    const query: any = {
      owner: userId,
    };

    // Only filter out deleted items if includeDeleted is false
    if (!includeDeleted) {
      query.deletedAt = null;
    }

    if (parentId === null) {
      query.parent = null;
    } else if (parentId) {
      query.parent = parentId;
    }

    return await Folder.find(query)
      .populate("parent")
      .sort({ isPinned: -1, updatedAt: -1 });
  }

  /**
   * Get all soft-deleted folders for user
   * @param userId - Folder owner
   * @returns Deleted folder docs
   */
  async getUserDeletedFolders(userId: string): Promise<IFolder[]> {
    return await Folder.find({
      owner: userId,
      deletedAt: { $ne: null },
    })
      .populate("owner")
      .populate("parent")
      .sort({ updatedAt: -1 });
  }

  /**
   * Get folder by ID, optionally include deleted
   * @param folderId - Folder ID
   * @param includeDeleted - Include deleted if true
   * @returns Folder doc or null
   */
  async getFolderById(folderId: string, includeDeleted: boolean = false): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return null;
    }

    const query: any = { _id: folderId };
    if (!includeDeleted) {
      query.deletedAt = null;
    }

    // Don't populate owner to avoid type issues with ID comparison
    return await Folder.findOne(query)
      .populate("parent");
  }

  /**
   * Update folder (not name/parent)
   * @param folderId - Folder ID
   * @param updateData - Fields to update
   * @returns Updated doc or null
   */
  async updateFolder(
    folderId: string,
    updateData: UpdateFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(folderId, updateData, { new: true })
      .populate("owner")
      .populate("parent");
  }

  /**
   * Rename folder
   * @param folderId - Folder ID
   * @param renameData - New name
   * @returns Updated doc or null
   */
  async renameFolder(
    folderId: string,
    renameData: RenameFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(
      folderId,
      { name: renameData.name },
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  /**
   * Move folder to new parent
   * @param folderId - Folder ID
   * @param moveData - New parent ID and optionally new name
   * @returns Updated doc or null
   */
  async moveFolder(
    folderId: string,
    moveData: MoveFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    
    // Prepare update data
    const updateData: any = { parent: moveData.parent };
    
    // Only update name if it's provided (for duplicate handling)
    if (moveData.name) {
      updateData.name = moveData.name;
    }
    
    return await Folder.findByIdAndUpdate(
      folderId,
      updateData,
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  /**
   * Soft-delete folder (mark as deleted)
   * @param folderId - Folder ID
   * @returns Updated doc or null
   */
  async softDeleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(
      folderId,
      { 
        deletedAt: new Date()
      },
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  /**
   * Restore soft-deleted folder
   * @param folderId - Folder ID
   * @param shouldMoveToRoot - Whether to move the folder to root level
   * @returns Updated doc or null
   */
  async restoreDeletedFolder(
    folderId: string,
    shouldMoveToRoot: boolean = false
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    
    const updateData: any = { deletedAt: null };
    if (shouldMoveToRoot) {
      updateData.parent = null;
    }
    
    return await Folder.findByIdAndUpdate(
      folderId,
      updateData,
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  /**
   * Permanently delete folder
   * @param folderId - Folder ID
   * @returns True if deleted
   */
  async permanentDeleteFolder(folderId: string): Promise<boolean> {
    const result = await Folder.deleteOne({ _id: folderId });
    return result.deletedCount === 1;
  }

  /**
   * Check if folder exists by name/parent/owner
   * @param name - Folder name
   * @param ownerId - Owner ID
   * @param parentId - Parent ID (null=root)
   * @returns Folder doc or null
   */
  async checkFolderExists(
    name: string,
    ownerId: string,
    parentId: string | null
  ): Promise<IFolder | null> {
    const query: any = {
      name,
      owner: ownerId,
      deletedAt: null,
    };

    // Only add parent to query if it's a valid ObjectId or null
    if (parentId === null) {
      query.parent = null;
    } else if (mongoose.Types.ObjectId.isValid(parentId)) {
      query.parent = parentId;
    }

    return await Folder.findOne(query)
      .populate("owner")
      .populate("parent");
  }

  /**
   * Get direct subfolders
   * @param folderId - Parent folder ID
   * @param includeDeleted - Include deleted if true
   * @returns Array of child folder IDs
   */
  async getSubfolders(
    folderId: string,
    includeDeleted: boolean = false
  ): Promise<string[]> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return [];
    }

    const subfolders = await Folder.find({
      parent: folderId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    }).select("_id");

    return subfolders.map((folder) => folder._id.toString());
  }

  /**
   * Recursively get all descendant folders
   * @param folderId - Root folder ID
   * @param includeDeleted - Include deleted if true
   * @returns All descendant folder IDs
   */
  async getAllDescendantFolders(
    folderId: string,
    includeDeleted: boolean = false
  ): Promise<string[]> {
    const descendants: string[] = [];
    const queue = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await Folder.find({ parent: currentId }, { _id: 1 });

      for (const child of children) {
        descendants.push(child._id.toString());
        queue.push(child._id.toString());
      }
    }

    return descendants;
  }

  /**
   * Bulk update folder paths/segments
   * @param oldPathPrefix - Path prefix to replace
   * @param newPathPrefix - New prefix
   * @param pathSegmentsToUpdate - Segments to update
   * @returns Update result
   */
  async bulkUpdateFolderPaths(
    oldPathPrefix: string,
    newPathPrefix: string,
    pathSegmentsToUpdate: {
      index: number;
      value: { name: string; id: string };
    }[] = []
  ): Promise<{ acknowledged: boolean; modifiedCount: number }> {
    const updateOperations: any = {};

    // Update path prefix
    if (oldPathPrefix && newPathPrefix) {
      updateOperations.$set = {
        path: {
          $replaceOne: {
            find: `^${oldPathPrefix}`,
            replacement: newPathPrefix,
          },
        },
      };
    }

    // Update specific path segments if provided
    if (pathSegmentsToUpdate.length > 0) {
      pathSegmentsToUpdate.forEach(({ index, value }) => {
        updateOperations.$set[`pathSegments.${index}`] = value;
      });
    }

    // Execute the update
    const result = await Folder.updateMany(
      {
        path: { $regex: `^${oldPathPrefix}` },
      },
      updateOperations
    );

    return {
      acknowledged: result.acknowledged,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Permanently delete all user's soft-deleted folders
   * @param userId - Owner ID
   * @returns Delete result
   */
  async permanentDeleteAllDeletedFolders(
    userId: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const result = await Folder.deleteMany({
      owner: userId,
      deletedAt: { $ne: null },
    });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount || 0,
    };
  }

  /**
   * Find folder by name in parent
   */
  async findFolderByName(
    name: string,
    userId: string,
    parentId: string | null
  ): Promise<IFolder | null> {
    return await Folder.findOne({
      name,
      owner: new Types.ObjectId(userId),
      parent: parentId ? new Types.ObjectId(parentId) : null,
      deletedAt: null
    });
  }

  /**
   * Get folder with real-time count of subfolders and files
   * @param folderId - Folder ID
   * @returns Folder with count or null
   */
  async getFolderWithCount(folderId: string): Promise<(IFolder & { items: number }) | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;

    const result = await Folder.aggregate([
      { $match: { _id: new Types.ObjectId(folderId) } },
      {
        $lookup: {
          from: 'folders',
          localField: '_id',
          foreignField: 'parent',
          pipeline: [
            // Remove the deletedAt filter to include all subfolders
          ],
          as: 'subfolders'
        }
      },
      {
        $lookup: {
          from: 'files',
          localField: '_id',
          foreignField: 'folder',
          pipeline: [
            // Remove the deletedAt filter to include all files
          ],
          as: 'files'
        }
      },
      {
        $addFields: {
          items: {
            $add: [
              { $size: '$subfolders' },
              { $size: '$files' }
            ]
          }
        }
      },
      {
        $project: {
          subfolders: 0,
          files: 0
        }
      }
    ]);

    return result[0] || null;
  }

  /**
   * Get counts for multiple folders at once
   * @param folderIds - Array of folder IDs to get counts for
   * @returns Map of folder ID to items
   */
  async getFolderCounts(folderIds: string[]): Promise<Map<string, number>> {
    if (!folderIds.length) return new Map();

    const result = await Folder.aggregate([
      {
        $match: {
          _id: { $in: folderIds.map(id => new Types.ObjectId(id)) }
        }
      },
      {
        $lookup: {
          from: 'folders',
          localField: '_id',
          foreignField: 'parent',
          pipeline: [
            // Remove the deletedAt filter to include all subfolders
          ],
          as: 'subfolders'
        }
      },
      {
        $lookup: {
          from: 'files',
          localField: '_id',
          foreignField: 'folder',
          pipeline: [
            // Remove the deletedAt filter to include all files
          ],
          as: 'files'
        }
      },
      {
        $project: {
          _id: 1,
          items: {
            $add: [
              { $size: '$subfolders' },
              { $size: '$files' }
            ]
          }
        }
      }
    ]);

    // Convert array to Map for easy lookup
    return new Map(
      result.map(item => [item._id.toString(), item.items])
    );
  }

  /**
   * Get user's folders with items
   * @param userId - Folder owner
   * @param parentId - Parent folder (null=root)
   * @param includeDeleted - Include deleted folders if true
   * @returns Folder docs array with items
   */
  async getUserFoldersWithCounts(
    userId: string,
    parentId?: string | null,
    includeDeleted?: boolean
  ): Promise<any[]> {
    const query: any = {
      owner: userId,
    };

    // Only filter out deleted items if includeDeleted is false
    if (!includeDeleted) {
      query.deletedAt = null;
    }

    if (parentId === null) {
      query.parent = null;
    } else if (parentId) {
      query.parent = parentId;
    }

    const folders = await Folder.find(query)
      .populate("parent")
      .sort({ isPinned: -1, updatedAt: -1 });

    if (!folders.length) return [];

    // Get items for all folders
    const itemsMap = await this.getFolderCounts(folders.map(f => f._id.toString()));

    // Add items to folders
    return folders.map(folder => {
      const folderObj = folder.toObject();
      return {
        ...folderObj,
        items: itemsMap.get(folder._id.toString()) || 0
      };
    });
  }

  /**
   * Get folder creation analytics by date range
   * @param startDate - Required start date for analytics (YYYY-MM-DD format)
   * @param endDate - Required end date for analytics (YYYY-MM-DD format)
   * @returns Array of daily folder creation counts
   */
  async getFolderCreationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; count: number }[]> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const result = await Folder.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1
        }
      }
    ]);

    return result;
  }
}

export default new FolderDao();
