import { CreateFileDto, MoveFileDto, RenameFileDto, UpdateFileDto } from "@api/file/file.dto.js";
import File, { IFile } from "@api/file/file.model.js";
import { Types } from "mongoose";

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
    const newFile = new File({
      ...data,
      owner: new Types.ObjectId(data.owner.toString()),
      folder: data.folder ? new Types.ObjectId(data.folder.toString()) : null
    });
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
    if (!Types.ObjectId.isValid(id)) return null;

    return await File.findByIdAndUpdate(id, data, { new: true })
      .populate("owner")
      .populate("folder");
  }

  async renameFile(
    id: string,
    data: RenameFileDto
  ): Promise<IFile | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await File.findByIdAndUpdate(id, data, { new: true })
      .populate("owner")
      .populate("folder");
  }

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
   * Soft delete a file by setting deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Updated file document with deletedAt timestamp if successful, null otherwise
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
   * Restore a soft-deleted file by clearing the deletedAt timestamp
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Updated file document with cleared deletedAt timestamp if successful, null otherwise
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
   * Permanently delete a file from the database
   *
   * @param id - MongoDB ObjectId string of the file
   * @returns Deletion result object with acknowledged and deletedCount properties
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
   * Get all files in a folder and its subfolders (for permanent deletion)
   * 
   * @param folderId ID of the folder
   * @param includeDeleted Whether to include deleted files
   * @returns Array of files in the folder and subfolders
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
