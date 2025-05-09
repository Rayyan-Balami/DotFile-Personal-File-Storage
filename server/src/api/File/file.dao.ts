import {
  CreateFileDto,
  UpdateFileDto
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
      deletedAt: null // Only check non-deleted files
    };

    return await File.findOne(query);
  }
}

export default new FileDao();
