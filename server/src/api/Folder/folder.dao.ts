import {
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto,
} from "@api/folder/folder.dto.js";
import { Folder, IFolder } from "@api/folder/folder.model.js";
import mongoose from "mongoose";

class FolderDao {
  async createFolder(folderData: Partial<IFolder>): Promise<IFolder> {
    const newFolder = new Folder(folderData);
    return newFolder.save();
  }

  async getUserFolders(
    userId: string,
    parentId?: string | null,
    isDeleted?: boolean
  ): Promise<IFolder[]> {
    const query: any = {
      owner: userId,
      deletedAt: isDeleted ? { $ne: null } : null,
    };

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
   * Get all deleted folders for a user
   *
   * @param userId ID of the user whose deleted folders to retrieve
   * @returns Array of deleted folders
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

  async updateFolder(
    folderId: string,
    updateData: UpdateFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(folderId, updateData, { new: true })
      .populate("owner")
      .populate("parent");
  }

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

  async moveFolder(
    folderId: string,
    moveData: MoveFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(
      folderId,
      { parent: moveData.parent },
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  async softDeleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(
      folderId,
      { deletedAt: new Date() },
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  async restoreDeletedFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return await Folder.findByIdAndUpdate(
      folderId,
      { deletedAt: null },
      { new: true }
    )
      .populate("owner")
      .populate("parent");
  }

  async permanentDeleteFolder(folderId: string): Promise<boolean> {
    const result = await Folder.deleteOne({ _id: folderId });
    return result.deletedCount === 1;
  }

  /**
   * Check if a folder with the given name exists in a specific parent folder
   *
   * @param name Folder name to check
   * @param ownerId User who owns the folder
   * @param parentId Parent folder ID (null for root level)
   * @returns Folder document if found, null otherwise
   */
  async checkFolderExists(
    name: string,
    ownerId: string,
    parentId: string | null
  ): Promise<IFolder | null> {
    return await Folder.findOne({
      name,
      owner: ownerId,
      parent: parentId,
      deletedAt: null,
    })
      .populate("owner")
      .populate("parent");
  }

  /**
   * Get all subfolders of a folder
   *
   * @param folderId ID of the folder
   * @param includeDeleted Whether to include deleted folders
   * @returns Array of subfolder IDs
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
   * Recursively get all descendant folders of a folder
   *
   * @param folderId ID of the folder
   * @param includeDeleted Whether to include deleted folders
   * @returns Array of all descendant folder IDs
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
   * Update folder paths in bulk
   * This is used when moving or renaming folders to update all child paths
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
}

export default new FolderDao();
