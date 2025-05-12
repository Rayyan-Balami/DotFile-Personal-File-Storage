import { CreateFileDto, MoveFileDto, RenameFileDto, UpdateFileDto } from "@api/File/file.dto.js";
import File, { IFile } from "@api/File/file.model.js";
import mongoose from "mongoose";

/**
 * Data Access Object for File operations
 * Handles all database interactions related to files
 */
class FileDao {
  /**
   * Create a new file document in the database
   *
   * @param data - File data conforming to CreateFileDto
   * @returns Newly created file document
   */
  async createFile(data: CreateFileDto): Promise<IFile> {
    const newFile = new File(data);
    return await newFile.save();
  }

  /**
   * Get a file by its ID
   *
   * @param id - MongoDB ObjectId string of the file
   * @param includeDeleted - When true, includes soft-deleted files in search
   * @returns File document if found, null otherwise
   */
  async getFileById(
    id: string,
    includeDeleted: boolean = false
  ): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return await File.findOne({
      _id: id,
      ...(includeDeleted ? {} : { deletedAt: null }),
    });
  }

  /**
   * Update a file document
   *
   * @param id - MongoDB ObjectId string of the file
   * @param data - Update data conforming to UpdateFileDto
   * @param includeDeleted - When true, allows updating soft-deleted files
   * @returns Updated file document if found and updated, null otherwise
   */
  async updateFile(
    id: string,
    data: UpdateFileDto,
    includeDeleted: boolean = false
  ): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return await File.findOneAndUpdate(
      { _id: id, ...(includeDeleted ? {} : { deletedAt: null }) },
      data,
      { new: true }
    );
  }

  async renameFile(
    id: string,
    data: RenameFileDto
  ): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await File.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { name: data.name, path: data.path },
      { new: true }
    );
  }

  async moveFile(
    id: string,
    data: MoveFileDto
  ): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await File.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        folder: data.folder,
        path: data.path,
        pathSegments: data.pathSegments,
      },
      { new: true }
    );
  }

  /**
   * Soft delete a file by setting deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Updated file document with deletedAt timestamp if successful, null otherwise
   */
  async softDeleteFile(id: string): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return await File.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Restore a soft-deleted file by clearing the deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Updated file document with cleared deletedAt timestamp if successful, null otherwise
   */
  async restoreDeletedFile(id: string): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await File.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );
  }

  /**
   * Permanently delete a file from the database
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Deletion result object with acknowledged and deletedCount properties
   */
  async permanentDeleteFile(
    id: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { acknowledged: false, deletedCount: 0 };
    }

    const result = await File.deleteOne({ _id: id });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Get all files in a folder
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param folderId - MongoDB ObjectId string of the folder (optional)
   * @param isDeleted - When true, returns only deleted files
   * @returns Array of file documents matching the criteria
   */
  async getUserFilesByFolders(
    userId: string,
    folderId?: string | null,
    isDeleted?: boolean
  ): Promise<IFile[]> {
    return File.find({
      owner: userId,
      folder: folderId || null,
      deletedAt: isDeleted ? { $ne: null } : null,
    }).sort({ [isDeleted ? "deletedAt" : "createdAt"]: -1 });
  }

  /**
   * Check if a file with the given name and extension exists in a specific folder
   *
   * @param name File name without extension
   * @param extension File extension
   * @param ownerId User who owns the file
   * @param folderId Folder where to check (null for root level)
   * @returns File document if found, null otherwise
   */
  async checkFileExists(
    name: string,
    extension: string,
    ownerId: string,
    folderId: string | null
  ): Promise<IFile | null> {
    const query = {
      name,
      extension,
      owner: new mongoose.Types.ObjectId(ownerId),
      folder: folderId ? new mongoose.Types.ObjectId(folderId) : null,
      deletedAt: null, // Only check non-deleted files
    };

    return await File.findOne(query);
  }

  /**
   * Update a file's path and pathSegments when its parent folder is renamed
   *
   * @param folderId The ID of the parent folder
   * @param newPathPrefix The new path prefix for all files in this folder
   * @param newPathSegments The updated path segments for all files in this folder
   * @returns Result of the update operation
   */
  async updateFilesPathByFolder(
    folderId: string,
    newPathPrefix: string,
    newPathSegments: { name: string; id: string }[]
  ): Promise<{ acknowledged: boolean; modifiedCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return { acknowledged: false, modifiedCount: 0 };
    }

    const result = await File.updateMany(
      { folder: folderId, deletedAt: null },
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
   * Bulk update files' folder, path, and pathSegments when they are moved
   *
   * @param fileIds Array of file IDs to update
   * @param newFolderId The new parent folder ID
   * @param newPathPrefix The new path prefix for the files
   * @param newPathSegments The updated path segments for the files
   * @returns Result of the update operation
   */
  async moveFiles(
    fileIds: string[],
    newFolderId: string | null,
    newPathPrefix: string,
    newPathSegments: { name: string; id: string }[]
  ): Promise<{ acknowledged: boolean; modifiedCount: number }> {
    if (!fileIds.length) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    // Validate all IDs are proper MongoDB ObjectIds
    const validIds = fileIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (!validIds.length) {
      return { acknowledged: false, modifiedCount: 0 };
    }

    const result = await File.updateMany(
      { _id: { $in: validIds }, deletedAt: null },
      {
        $set: {
          folder: newFolderId,
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
   * Update files when a specific folder is recursively updated
   * This is used when a parent folder is renamed or moved
   *
   * @param oldPathPrefix The old path prefix to match
   * @param newPathPrefix The new path prefix to replace it with
   * @param pathSegmentsToUpdate Additional path segments to update or replace
   * @returns Result of the update operation
   */
  async bulkUpdateFilePaths(
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

    // Find all matching files to update
    const filesToUpdate = await File.find({
      path: { $regex: `^${oldPathPrefix}` },
      deletedAt: null,
    });

    if (filesToUpdate.length === 0) {
      return { acknowledged: true, modifiedCount: 0 };
    }

    // Track successful updates
    let modifiedCount = 0;

    // Process each file individually with string replacements
    for (const file of filesToUpdate) {
      // Update the path with string replacement
      let newPath = file.path;
      if (oldPathPrefix !== newPathPrefix) {
        newPath = file.path.replace(
          new RegExp(`^${oldPathPrefix}`),
          newPathPrefix
        );
      }

      // Prepare updates object
      const updates: any = { path: newPath };

      // Apply path segment updates if any provided
      if (pathSegmentsToUpdate.length > 0) {
        const pathSegments = [...file.pathSegments]; // Clone the array
        pathSegmentsToUpdate.forEach((update) => {
          if (update.index < pathSegments.length) {
            pathSegments[update.index] = {
              name: update.value.name,
              id: new mongoose.Schema.Types.ObjectId(update.value.id),
            };
          }
        });
        updates.pathSegments = pathSegments;
      }

      // Update this file
      const result = await File.updateOne({ _id: file._id }, { $set: updates });
      if (result.modifiedCount > 0) {
        modifiedCount++;
      }
    }

    return {
      acknowledged: true,
      modifiedCount: modifiedCount,
    };
  }

  /**
   * Get all deleted files for a user
   * 
   * @param userId ID of the user
   * @returns Array of soft-deleted files
   */
  async getUserDeletedFiles(userId: string): Promise<IFile[]> {
    return await File.find({
      owner: userId,
      deletedAt: { $ne: null }
    }).sort({ deletedAt: -1 });
  }
}

export default new FileDao();
