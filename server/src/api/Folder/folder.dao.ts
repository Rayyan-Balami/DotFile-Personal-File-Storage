import { MoveFolderDto, RenameFolderDto, UpdateFolderDto } from "@api/Folder/folder.dto.js";
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
      .sort({ [isDeleted ? "deletedAt" : "createdAt"]: -1 });
  }

  async getFolderById(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findById(folderId);
  }

  /**
   * Get folder by ID with populated workspace data
   *
   * @param folderId The ID of the folder to retrieve
   * @returns Folder with populated workspace or null if not found
   */
  async getFolderWithWorkspace(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findById(folderId).populate("workspace");
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
    );
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
    );
  }

  async moveFolder(
    folderId: string,
    moveData: MoveFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { parent: moveData.parent, path: moveData.path, pathSegments: moveData.pathSegments } },
      { new: true }
    );
  }

  async softDeleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
  }

  async restoreFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { deletedAt: null } },
      { new: true }
    );
  }

  async permanentDeleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndDelete(folderId);
  }

  async checkFolderExists(
    name: string,
    ownerId: string,
    parentId: string | null | undefined
  ): Promise<IFolder | null> {
    return Folder.findOne({
      name,
      owner: ownerId,
      parent: parentId || null,
      deletedAt: null,
    });
  }

  /**
   * Get all subfolders of a given folder (direct children)
   *
   * @param folderId The parent folder ID
   * @returns Array of child folders
   */
  async getChildFolders(folderId: string): Promise<IFolder[]> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return [];

    return Folder.find({
      parent: folderId,
      deletedAt: null,
    });
  }

  /**
   * Get all descendant folders recursively (all levels of children)
   *
   * @param folderId The parent folder ID
   * @returns Array of all descendant folders
   */
  async getAllDescendantFolders(folderId: string): Promise<IFolder[]> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return [];

    // This will get all folders whose path starts with the parent's path
    // but excludes the parent folder itself
    const parentFolder = await this.getFolderById(folderId);
    if (!parentFolder) return [];

    return Folder.find({
      path: { $regex: `^${parentFolder.path}/` },
      deletedAt: null,
    }).sort({ path: 1 }); // Sort by path for predictable order
  }

  /**
   * Bulk update paths for all folders inside a renamed or moved folder
   * Uses a materialized path approach for efficiency
   *
   * @param oldPathPrefix The old path prefix to match
   * @param newPathPrefix The new path prefix to replace it with
   * @param pathSegmentsToUpdate Path segments to update or replace
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
    // If old and new paths are the same, only update path segments if needed
    if (oldPathPrefix === newPathPrefix && pathSegmentsToUpdate.length === 0) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    // Find all matching folders to update
    const foldersToUpdate = await Folder.find({
      path: { $regex: `^${oldPathPrefix}/` }, // Match folders strictly under this path
      deletedAt: null,
    });

    if (foldersToUpdate.length === 0) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    // Track successful updates
    let modifiedCount = 0;

    // Process each folder individually with string replacements
    for (const folder of foldersToUpdate) {
      // Update the path with string replacement
      let newPath = folder.path;
      if (oldPathPrefix !== newPathPrefix) {
        newPath = folder.path.replace(
          new RegExp(`^${oldPathPrefix}`),
          newPathPrefix
        );
      }

      // Prepare updates object
      const updates: any = { path: newPath };

      // Apply path segment updates if any provided
      if (pathSegmentsToUpdate.length > 0) {
        const pathSegments = [...folder.pathSegments]; // Clone the array
        pathSegmentsToUpdate.forEach((update) => {
          if (update.index < pathSegments.length) {
            // Use the same type of ObjectId as defined in your model
            pathSegments[update.index] = {
              name: update.value.name,
              id: new mongoose.Schema.Types.ObjectId(update.value.id),
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
      modifiedCount: modifiedCount,
    };
  }
}

export default new FolderDao();
