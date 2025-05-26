import { CreateFileDto, MoveFileDto, RenameFileDto, UpdateFileDto } from "@api/file/file.dto.js";
import File, { IFile } from "@api/file/file.model.js";
import { Types } from "mongoose";

/**
 * FileDao: Data access layer for file operations
 */
class FileDao {
  /**
   * Create and save a new file
   * @param data - File creation data with owner and optional folder
   * @returns Newly created file document
   */
  async createFile(data: CreateFileDto): Promise<IFile> {
    const newFile = new File({
      ...data,
      owner: new Types.ObjectId(data.owner.toString()),
      folder: data.folder ? new Types.ObjectId(data.folder.toString()) : null
    });
    return await newFile.save();
  }

  /**
   * Get file by ID with optional deleted files inclusion
   * @param id - MongoDB ObjectId string
   * @param includeDeleted - When true, includes soft-deleted files
   * @returns File document or null if not found
   */
  async getFileById(
    id: string,
    includeDeleted: boolean = false
  ): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const query: any = { _id: id };
    if (!includeDeleted) {
      query.deletedAt = null;
    }

    return await File.findOne(query)
      .populate("owner")
      .populate("folder");
  }

  /**
   * Update file data by ID
   * @param id - MongoDB ObjectId string
   * @param data - Update data conforming to UpdateFileDto
   * @param includeDeleted - When true, allows updating soft-deleted files
   * @returns Updated file document or null if not found
   */
  async updateFile(
    id: string,
    data: UpdateFileDto,
    includeDeleted: boolean = false
  ): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return await File.findByIdAndUpdate(id, data, { new: true })
      .populate("owner")
      .populate("folder");
  }

  /**
   * Rename file by ID
   * @param id - MongoDB ObjectId string
   * @param data - Rename data with new file name
   * @returns Updated file document or null if not found
   */
  async renameFile(
    id: string,
    data: RenameFileDto
  ): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await File.findByIdAndUpdate(id, data, { new: true })
      .populate("owner")
      .populate("folder");
  }

  /**
   * Move file to different folder
   * @param id - MongoDB ObjectId string
   * @param data - Move data with target folder ID
   * @returns Updated file document or null if not found
   */
  async moveFile(
    id: string,
    data: MoveFileDto
  ): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await File.findByIdAndUpdate(id, data, { new: true })
      .populate("owner")
      .populate("folder");
  }

  /**
   * Soft delete file by setting deletedAt timestamp
   * @param id - MongoDB ObjectId string
   * @returns File document with deletedAt timestamp or null if not found
   */
  async softDeleteFile(id: string): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return await File.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    )
      .populate("owner")
      .populate("folder");
  }

  /**
   * Restore soft-deleted file by clearing deletedAt timestamp
   * @param id - MongoDB ObjectId string
   * @returns Restored file document or null if not found
   */
  async restoreDeletedFile(id: string): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await File.findByIdAndUpdate(
      id,
      { deletedAt: null },
      { new: true }
    )
      .populate("owner")
      .populate("folder");
  }

  /**
   * Permanently delete file from database
   * @param id - MongoDB ObjectId string
   * @returns Deletion result with acknowledged and deletedCount properties
   */
  async permanentDeleteFile(
    id: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    if (!Types.ObjectId.isValid(id)) {
      return { acknowledged: false, deletedCount: 0 };
    }

    const result = await File.deleteOne({ _id: id });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Get user files by folder with optional deletion filter
   * @param userId - MongoDB ObjectId string of the user
   * @param folderId - MongoDB ObjectId string of the folder (optional, null for root)
   * @param isDeleted - When true, returns only deleted files
   * @returns Array of file documents sorted by pinned status and updated date
   */
  async getUserFilesByFolders(
    userId: string,
    folderId?: string | null,
    isDeleted?: boolean
  ): Promise<IFile[]> {
    const query: any = {
      owner: userId,
      deletedAt: isDeleted ? { $ne: null } : null,
    };

    if (folderId === null) {
      query.folder = null;
    } else if (folderId) {
      query.folder = folderId;
    }

    return await File.find(query)
      .populate("owner")
      .populate("folder")
      .sort({ isPinned: -1, updatedAt: -1 });
  }

  /**
   * Check if file exists with given name and extension in folder
   * @param name - File name without extension
   * @param extension - File extension
   * @param ownerId - User who owns the file
   * @param folderId - Folder to check (null for root level)
   * @returns File document if exists, null otherwise
   */
  async checkFileExists(
    name: string,
    extension: string,
    ownerId: string,
    folderId: string | null
  ): Promise<IFile | null> {
    return await File.findOne({
      name,
      extension,
      owner: new Types.ObjectId(ownerId),
      folder: folderId ? new Types.ObjectId(folderId) : null,
      deletedAt: null,
    })
      .populate("owner")
      .populate("folder");
  }

  /**
   * Get deleted files in specific folder
   * @param userId - MongoDB ObjectId string of the user
   * @param folderId - MongoDB ObjectId string of the folder
   * @returns Array of deleted files in the folder
   */
  async getDeletedUserFilesByFolders(
    userId: string,
    folderId: string,
  ): Promise<IFile[]> {
    if (!Types.ObjectId.isValid(folderId)) {
      return [];
    }
    
    const query = {
      owner: userId,
      folder: folderId,
      deletedAt: { $ne: null },
    };

    return await File.find(query)
      .populate("owner")
      .populate("folder")
      .sort({ updatedAt: -1 });
  }

  /**
   * Get all deleted files for user
   * @param userId - MongoDB ObjectId string of the user
   * @returns Array of all deleted files sorted by updated date
   */
  async getAllDeletedFiles(
    userId: string
  ): Promise<IFile[]> {
    return await File.find({
      owner: userId,
      deletedAt: { $ne: null },
    })
      .populate("owner")
      .populate("folder")
      .sort({ updatedAt: -1 });
  }

  /**
   * Permanently delete all user's deleted files
   * @param userId - MongoDB ObjectId string of the user
   * @returns Deletion result with acknowledged and deletedCount properties
   */
  async permanentDeleteAllDeletedFiles(
    userId: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const result = await File.deleteMany({
      owner: userId,
      deletedAt: { $ne: null },
    });

    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  }
}

export default new FileDao();
