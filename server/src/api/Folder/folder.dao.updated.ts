// filepath: /Users/rayyanbalami/Documents/proj/server/src/api/Folder/folder.dao.ts
import {
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto,
} from "@api/Folder/folder.dto.js";
import { Folder, IFolder } from "@api/Folder/folder.model.js";
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
    return Folder.find({
      owner: userId,
      parent: parentId || null,
      deletedAt: isDeleted ? { $ne: null } : null,
    })
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare")
      .sort({ [isDeleted ? "deletedAt" : "createdAt"]: -1 });
  }

  /**
   * Get all deleted folders for a user
   *
   * @param userId ID of the user whose deleted folders to retrieve
   * @returns Array of deleted folders
   */
  async getUserDeletedFolders(userId: string): Promise<IFolder[]> {
    return Folder.find({
      owner: userId,
      deletedAt: { $ne: null },
    })
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare")
      .sort({ deletedAt: -1 });
  }

  async getFolderById(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findById(folderId)
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  async updateFolder(
    folderId: string,
    updateData: UpdateFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: updateData },
      { new: true }
    )
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  async renameFolder(
    folderId: string,
    renameData: RenameFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { name: renameData.name, path: renameData.path } },
      { new: true }
    )
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  async moveFolder(
    folderId: string,
    moveData: MoveFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      {
        $set: {
          parent: moveData.parent,
          path: moveData.path,
          pathSegments: moveData.pathSegments,
        },
      },
      { new: true }
    )
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  async softDeleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { deletedAt: new Date() } },
      { new: true }
    )
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  async restoreDeletedFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { deletedAt: null } },
      { new: true }
    )
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  async permanentDeleteFolder(folderId: string): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return { acknowledged: false, deletedCount: 0 };
    }

    const result = await Folder.deleteOne({ _id: folderId });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
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
      parent: parentId || null,
      deletedAt: null, // Only check non-deleted folders
    })
      .populate("workspace")
      .populate("publicShare")
      .populate("userShare");
  }

  /**
   * Update a folder's path and pathSegments when its parent folder is renamed
   *
   * @param parentFolderId The ID of the parent folder
   * @param newPathPrefix The new path prefix for all folders under this parent
   * @param newPathSegments The updated path segments for all folders under this parent
   * @returns Result of the update operation
   */
  async updateFoldersPathByParent(
    parentFolderId: string,
    newPathPrefix: string,
    newPathSegments: { name: string; id: string }[]
  ): Promise<{ acknowledged: boolean; modifiedCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(parentFolderId)) {
      return { acknowledged: false, modifiedCount: 0 };
    }

    const result = await Folder.updateMany(
      { parent: parentFolderId, deletedAt: null },
      {
        $set: {
          path: newPathPrefix,
          pathSegments: newPathSegments,
        },
      }
    );

    return {
      acknowledged: result.acknowledged,
      modifiedCount: result.modifiedCount,
    };
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
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return [];
    }

    const allDescendants: string[] = [];
    const queue: string[] = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const subfolders = await this.getSubfolders(currentId, includeDeleted);

      allDescendants.push(...subfolders);
      queue.push(...subfolders);
    }

    return allDescendants;
  }

  /**
   * Bulk update all folders when an ancestor folder is renamed or moved
   *
   * @param oldPathPrefix The old path prefix to match
   * @param newPathPrefix The new path prefix to replace it with
   * @param pathSegmentsToUpdate Additional path segments to update or replace
   * @returns Result of the update operation
   */
  async bulkUpdateFolderPaths(
    oldPathPrefix: string,
    newPathPrefix: string,
    pathSegmentsToUpdate: {
      index: number;
      value: { name: string; id: string };
    }[] = []
  ): Promise<{ acknowledged: boolean; modifiedCount: number }> {
    // If old and new paths are the same and no segments to update, no need to proceed
    if (oldPathPrefix === newPathPrefix && pathSegmentsToUpdate.length === 0) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    // Normalize paths for consistency
    const normalizedOldPath = oldPathPrefix.startsWith("/") ? oldPathPrefix : `/${oldPathPrefix}`;
    const normalizedNewPath = newPathPrefix.startsWith("/") ? newPathPrefix : `/${newPathPrefix}`;

    // Use normalized paths for database queries
    const oldPath = normalizedOldPath;
    const newPath = normalizedNewPath;

    // Find all matching folders to update (with paths starting with the old path)
    const foldersToUpdate = await Folder.find({
      path: { $regex: `^${oldPath.replace(/\//g, "\\/")}` },
      deletedAt: null,
    });

    if (foldersToUpdate.length === 0) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    // Track successful updates
    let modifiedCount = 0;

    console.log(`bulkUpdateFolderPaths: Found ${foldersToUpdate.length} folders to update`);
    console.log(`Replacing path prefix '${oldPath}' with '${newPath}'`);

    // Process each folder individually with string replacements
    for (const folder of foldersToUpdate) {
      // Update the path with string replacement
      let updatedFolderPath = folder.path;
      if (oldPath !== newPath) {
        updatedFolderPath = folder.path.replace(
          new RegExp(`^${oldPath.replace(/\//g, "\\/")}`),
          newPath
        );
        console.log(`Folder path update: '${folder.path}' -> '${updatedFolderPath}'`);
      }

      // Prepare updates object
      const updates: any = { path: updatedFolderPath };

      // Apply path segment updates if any provided
      if (pathSegmentsToUpdate.length > 0) {
        const pathSegments = [...folder.pathSegments]; // Clone the array
        pathSegmentsToUpdate.forEach((update) => {
          if (update.index < pathSegments.length) {
            pathSegments[update.index] = {
              name: update.value.name,
              id: new mongoose.Types.ObjectId(update.value.id),
            };
          }
        });
        updates.pathSegments = pathSegments;
      }

      // Update this folder
      const result = await Folder.updateOne(
        { _id: folder._id },
        { $set: updates }
      );
      if (result.modifiedCount > 0) {
        modifiedCount++;
      }
    }

    return {
      acknowledged: true,
      modifiedCount,
    };
  }
}

export default new FolderDao();
