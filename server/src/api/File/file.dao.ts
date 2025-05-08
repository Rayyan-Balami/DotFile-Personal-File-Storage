import {
  CreateFileDto,
  GetFilesQueryDto,
  UpdateFileDto,
} from "@api/File/file.dto.js";
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
   * Get files based on query parameters
   *
   * @param query - Query filters including owner and optional filters
   * @returns Array of file documents
   */
  async getFiles(
    query: GetFilesQueryDto & { owner: string }
  ): Promise<IFile[]> {
    const { includeDeleted = false, ...filters } = query;

    if (!mongoose.Types.ObjectId.isValid(filters.owner)) return [];
    return await File.find({
      owner: filters.owner,
      deletedAt: includeDeleted ? { $ne: null } : null,
    });
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

  /**
   * Soft delete a file by setting deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Updated file document with deletedAt timestamp if successful, null otherwise
   */
  async deleteFile(id: string): Promise<IFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return await File.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Permanently delete a file from the database
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Deletion result object with acknowledged and deletedCount properties
   */
  async permanentlyDeleteFile(
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
   * @param folderId - MongoDB ObjectId string of the folder
   * @param includeDeleted - When true, includes soft-deleted files in results
   * @returns Array of file documents in the specified folder
   */
  async getFilesByFolder(
    folderId: string,
    includeDeleted: boolean = false
  ): Promise<IFile[]> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return [];

    return await File.find({
      folder: folderId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    }).sort({ createdAt: -1 });
  }

  /**
   * Get files by owner
   *
   * @param ownerId - MongoDB ObjectId string of the owner
   * @param includeDeleted - When true, includes soft-deleted files
   * @returns Array of file documents owned by the specified user
   */
  async getFilesByOwner(
    ownerId: string,
    includeDeleted: boolean = false
  ): Promise<IFile[]> {
    if (!mongoose.Types.ObjectId.isValid(ownerId)) return [];

    return await File.find({
      owner: ownerId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    }).sort({ createdAt: -1 });
  }

  /**
   * Search files by name or content
   *
   * @param userId - MongoDB ObjectId string of the user
   * @param searchTerm - Text to search for in filename or content
   * @param includeDeleted - When true, includes soft-deleted files
   * @returns Array of matching file documents
   */
  async searchFiles(
    userId: string,
    searchTerm: string,
    includeDeleted: boolean = false
  ): Promise<IFile[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];

    const regex = new RegExp(searchTerm, "i");

    return await File.find({
      owner: userId,
      $or: [{ name: regex }, { type: regex }],
      ...(includeDeleted ? {} : { deletedAt: null }),
    }).sort({ createdAt: -1 });
  }

  /**
   * Count files in a folder
   *
   * @param folderId - MongoDB ObjectId string of the folder
   * @param includeDeleted - When true, includes soft-deleted files in count
   * @returns Number of files in the folder
   */
  async countFilesByFolder(
    folderId: string,
    includeDeleted: boolean = false
  ): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return 0;

    return await File.countDocuments({
      folder: folderId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    });
  }

  /**
   * Update folder for multiple files
   *
   * @param fileIds - Array of file IDs to update
   * @param folderId - New folder ID (or null to move to root)
   * @param ownerId - Owner ID for verification
   * @returns Number of files updated
   */
  async updateFilesFolder(
    fileIds: string[],
    folderId: string | null,
    ownerId: string
  ): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(ownerId)) return 0;

    // Filter out invalid MongoDB IDs
    const validFileIds = fileIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validFileIds.length === 0) return 0;

    const result = await File.updateMany(
      {
        _id: { $in: validFileIds },
        owner: ownerId,
        deletedAt: null,
      },
      { folder: folderId }
    );

    return result.modifiedCount;
  }
}

export default new FileDao();
