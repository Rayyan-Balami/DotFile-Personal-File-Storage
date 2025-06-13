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
   * @param includeDeleted - When true, includes deleted files
   * @returns Array of file documents sorted by pinned status and updated date
   */
  async getUserFilesByFolders(
    userId: string,
    folderId?: string | null,
    includeDeleted?: boolean
  ): Promise<IFile[]> {
    const query: any = {
      owner: userId,
    };

    // Only filter out deleted items if includeDeleted is false
    if (!includeDeleted) {
      query.deletedAt = null;
    }

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

  /**
   * Get recent files for user within last month
   * @param userId - MongoDB ObjectId string of the user
   * @returns Array of recent files sorted by updated date
   */
  async getRecentFiles(
    userId: string
  ): Promise<IFile[]> {
    // Get files updated in the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return await File.find({
      owner: userId,
      deletedAt: null, // Exclude deleted files
      updatedAt: { $gte: oneMonthAgo } // Only files updated in last month
    })
      .populate("owner")
      .populate("folder")
      .sort({ updatedAt: -1 }); // Most recently updated first
  }

  /**
   * Get file creation analytics by date range
   * @param startDate - Required start date for analytics (YYYY-MM-DD format)
   * @param endDate - Required end date for analytics (YYYY-MM-DD format)
   * @returns Array of daily file creation counts
   */
  async getFileCreationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; count: number }[]> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const result = await File.aggregate([
      {
      $match: {
        createdAt: { $gte: start, $lte: end }
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

  /**
   * Get file count for a specific date range
   * @param startDate - Start date for counting files
   * @param endDate - End date for counting files
   * @returns Number of files created in the date range
   */
  async getFileCountByDateRange(startDate: Date, endDate: Date): Promise<number> {
    return await File.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
      deletedAt: null
    });
  }

  /**
   * Get total storage size for files in a specific date range
   * @param startDate - Start date for calculating storage
   * @param endDate - End date for calculating storage
   * @returns Total size in bytes for files created in the date range
   */
  async getStorageSizeByDateRange(startDate: Date, endDate: Date): Promise<number> {
    const result = await File.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: "$size" }
        }
      }
    ]);

    return result[0]?.totalSize || 0;
  }


  async getFileTypeCount(): Promise<{ [key: string]: number }> {
    const result = await File.aggregate([
      {
        $match: {
          deletedAt: null
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as { [key: string]: number });
  }

  /**
   * Search files by name/extension with filters
   * @param userId - User who owns the files
   * @param query - Search query (can be full filename with extension or just name)
   * @param location - Location filter (myDrive, trash, recent)
   * @param fileTypes - File type filters (extensions or MIME categories)
   * @param isPinned - Pinned filter
   * @param dateFrom - Start date filter
   * @param dateTo - End date filter
   * @returns Array of matching files
   */
  async searchFiles(
    userId: string,
    query?: string,
    location?: string,
    fileTypes?: string[],
    isPinned?: boolean,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<IFile[]> {
    const searchQuery: any = {
      owner: userId,
    };

    // Apply location filter
    switch (location) {
      case "trash":
        searchQuery.deletedAt = { $ne: null };
        break;
      case "recent":
        // Recent files (updated in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        searchQuery.updatedAt = { $gte: thirtyDaysAgo };
        searchQuery.deletedAt = null;
        break;
      default: // myDrive
        searchQuery.deletedAt = null;
    }

    // Apply text search filter (handle both full filename and name only)
    if (query && query.trim()) {
      const trimmedQuery = query.trim();
      
      // Check if query contains an extension
      const hasExtension = trimmedQuery.includes('.');
      
      if (hasExtension) {
        // Split filename and extension for exact matching
        const lastDotIndex = trimmedQuery.lastIndexOf('.');
        const nameQuery = trimmedQuery.substring(0, lastDotIndex);
        const extensionQuery = trimmedQuery.substring(lastDotIndex + 1);
        
        searchQuery.$or = [
          // Match full filename (name + extension)
          {
            $and: [
              { name: { $regex: nameQuery, $options: 'i' } },
              { extension: { $regex: extensionQuery, $options: 'i' } }
            ]
          },
          // Also match if query is contained in name only
          { name: { $regex: trimmedQuery, $options: 'i' } }
        ];
      } else {
        // Search in name only
        searchQuery.name = { $regex: trimmedQuery, $options: 'i' };
      }
    }

    // Apply file type filters
    if (fileTypes && fileTypes.length > 0) {
      const typeFilters: any[] = [];
      
      for (const fileType of fileTypes) {
        switch (fileType.toLowerCase()) {
          case 'image':
            typeFilters.push({ type: { $regex: '^image/', $options: 'i' } });
            break;
          case 'video':
            typeFilters.push({ type: { $regex: '^video/', $options: 'i' } });
            break;
          case 'audio':
            typeFilters.push({ type: { $regex: '^audio/', $options: 'i' } });
            break;
          case 'document':
            typeFilters.push({
              $or: [
                { type: { $regex: '^application/pdf', $options: 'i' } },
                { type: { $regex: 'document', $options: 'i' } },
                { type: { $regex: 'text/', $options: 'i' } },
                { extension: { $in: ['doc', 'docx', 'pdf', 'txt', 'rtf'] } }
              ]
            });
            break;
          case 'spreadsheet':
            typeFilters.push({
              $or: [
                { type: { $regex: 'spreadsheet', $options: 'i' } },
                { extension: { $in: ['xls', 'xlsx', 'csv'] } }
              ]
            });
            break;
          case 'presentation':
            typeFilters.push({
              $or: [
                { type: { $regex: 'presentation', $options: 'i' } },
                { extension: { $in: ['ppt', 'pptx', 'odp'] } }
              ]
            });
            break;
          case 'archive':
            typeFilters.push({
              $or: [
                { type: { $regex: 'zip', $options: 'i' } },
                { type: { $regex: 'rar', $options: 'i' } },
                { extension: { $in: ['zip', 'rar', '7z', 'tar', 'gz'] } }
              ]
            });
            break;
          case 'code':
            typeFilters.push({
              $or: [
                { extension: { $in: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift'] } },
                { type: { $regex: 'text/', $options: 'i' } }
              ]
            });
            break;
          default:
            // Treat as direct extension or MIME type
            typeFilters.push({
              $or: [
                { extension: { $regex: fileType, $options: 'i' } },
                { type: { $regex: fileType, $options: 'i' } }
              ]
            });
        }
      }
      
      if (typeFilters.length > 0) {
        searchQuery.$and = searchQuery.$and || [];
        searchQuery.$and.push({ $or: typeFilters });
      }
    }

    // Apply pinned filter
    if (isPinned !== undefined) {
      searchQuery.isPinned = isPinned;
    }

    // Apply date range filter
    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter.$lte = endOfDay;
      }
      searchQuery.createdAt = dateFilter;
    }

    return await File.find(searchQuery)
      .populate("owner")
      .populate("folder")
      .sort({ isPinned: -1, updatedAt: -1 });
  }
}

export default new FileDao();
