import { ApiError } from "@utils/apiError.js";
import fileDao from "@api/File/file.dao.js";
import folderService from "@api/Folder/folder.service.js";
import { IFile } from "@api/File/file.model.js";
import path from "path";
import { getUserDirectoryPath } from "@utils/mkdir.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.js";
import logger from "@utils/logger.js";
import { 
  CreateFileDto, 
  FileResponseDto, 
  GetFilesQueryDto, 
  UpdateFileDto 
} from "@api/File/file.dto.js";

/**
 * Service class for file-related business logic
 * Handles operations between controllers and data access layer
 */
class FileService {
  /**
   * Create a file record with virtual folder mapping
   * 
   * @param fileData File data including name, type, size, and storage key
   * @param userId User ID who owns the file
   * @param folderId Optional virtual folder ID
   * @returns Created file document
   */
  async createFileWithVirtualFolder(
    fileData: {
      name: string;
      type: string;
      size: number;
      storageKey: string;
      originalPath?: string;
    },
    userId: string,
    folderId?: string
  ): Promise<FileResponseDto> {
    logger.debug(`Creating file record for ${fileData.name} by user ${userId}`);
    
    // Create the file document
    const file = await fileDao.createFile({
      ...fileData,
      owner: userId,
      folder: folderId || null,
      // Using flat storage, so the path is directly in user directory
      path: `/${fileData.name}`,
      // Add the extension field - use the file type as extension
      extension: fileData.type || ''
    });
    
    // If file was added to a folder, increment the folder's item count
    if (folderId) {
      await folderService.incrementFolderItemCount(folderId);
    }
    
    return this.sanitizeFile(file);
  }

  /**
   * Create a file record from uploaded file
   * 
   * @param fileData File data from upload
   * @returns Created file document
   */
  async createFile(fileData: CreateFileDto): Promise<FileResponseDto> {
    logger.debug(`Creating file: ${fileData.name} for user ${fileData.owner}`);
    
    const file = await fileDao.createFile(fileData);
    
    // If file was added to a folder, increment the folder's item count
    if (fileData.folder) {
      await folderService.incrementFolderItemCount(fileData.folder);
    }
    
    return this.sanitizeFile(file);
  }

  /**
   * Get files by query criteria
   * 
   * @param query Query parameters for filtering files
   * @param userId User ID to filter by ownership
   * @returns Array of file records
   */
  async getFiles(query: GetFilesQueryDto, userId: string): Promise<FileResponseDto[]> {
    const files = await fileDao.getFiles({ ...query, owner: userId });
    return files.map(file => this.sanitizeFile(file));
  }

  /**
   * Get a file by ID
   * 
   * @param fileId File ID
   * @param userId User ID for ownership verification
   * @returns File document if found
   * @throws ApiError if file not found or user doesn't own it
   */
  async getFileById(fileId: string, userId: string): Promise<FileResponseDto> {
    const file = await fileDao.getFileById(fileId);
    
    if (!file) {
      throw new ApiError(404, "File not found", ["id"]);
    }
    
    // Check ownership
    if (file.owner.toString() !== userId) {
      throw new ApiError(403, "You don't have permission to access this file", ["access"]);
    }
    
    return this.sanitizeFile(file);
  }

  /**
   * Get the download URL/path for a file
   * 
   * @param fileId File ID
   * @param userId User ID for ownership verification
   * @returns Object with file path and display name
   * @throws ApiError if file not found or user doesn't own it
   */
  async getFileDownloadInfo(fileId: string, userId: string): Promise<{path: string, filename: string}> {
    const file = await fileDao.getFileById(fileId);
    
    if (!file) {
      throw new ApiError(404, "File not found", ["id"]);
    }
    
    // Check ownership
    if (file.owner.toString() !== userId) {
      throw new ApiError(403, "You don't have permission to access this file", ["access"]);
    }
    
    // Get the physical file path
    const userDir = getUserDirectoryPath(userId);
    const filePath = path.join(userDir, file.storageKey);
    
    // For display/download purposes, use the original filename
    const displayName = file.name + (file.type ? `.${file.type}` : '');
    
    return {
      path: filePath,
      filename: displayName
    };
  }

  /**
   * Update file information
   * 
   * @param fileId File ID to update
   * @param updateData Data to update
   * @param userId User ID for ownership verification
   * @returns Updated file document
   * @throws ApiError if file not found, user doesn't own it, or update fails
   */
  async updateFile(fileId: string, updateData: UpdateFileDto, userId: string): Promise<FileResponseDto> {
    // Verify file exists and user owns it
    await this.getFileById(fileId, userId);
    
    // Update the file
    const updatedFile = await fileDao.updateFile(fileId, updateData);
    
    if (!updatedFile) {
      throw new ApiError(500, "Failed to update file", ["update"]);
    }
    
    return this.sanitizeFile(updatedFile);
  }

  /**
   * Soft delete a file
   * 
   * @param fileId File ID to delete
   * @param userId User ID for ownership verification
   * @returns Deleted file document
   * @throws ApiError if file not found, user doesn't own it, or deletion fails
   */
  async deleteFile(fileId: string, userId: string): Promise<FileResponseDto> {
    // Verify file exists and user owns it
    const existingFile = await this.getFileById(fileId, userId);
    
    // Soft delete the file
    const deletedFile = await fileDao.deleteFile(fileId);
    
    if (!deletedFile) {
      throw new ApiError(500, "Failed to delete file", ["delete"]);
    }
    
    // If file was in a folder, decrement the folder's item count
    if (existingFile.folder) {
      await folderService.decrementFolderItemCount(existingFile.folder);
    }
    
    return this.sanitizeFile(deletedFile);
  }

  /**
   * Move files to a different folder
   * 
   * @param fileIds Array of file IDs to move
   * @param targetFolderId Destination folder ID (or null for root)
   * @param userId User ID for ownership verification
   * @returns Number of files moved successfully
   * @throws ApiError if the folder doesn't exist or user doesn't have access
   */
  async moveFilesToFolder(fileIds: string[], targetFolderId: string | null, userId: string): Promise<number> {
    // If there's a target folder, verify it exists and user has access
    if (targetFolderId) {
      const folder = await folderService.getFolderById(targetFolderId, userId);
      if (!folder) {
        throw new ApiError(404, "Target folder not found", ["folder"]);
      }
    }
    
    // Move the files
    const updatedCount = await fileDao.updateFilesFolder(fileIds, targetFolderId, userId);
    
    return updatedCount;
  }
  
  /**
   * Search for files by name or type
   * 
   * @param searchTerm Text to search for in filename or type
   * @param userId User ID for filtering by ownership
   * @returns Array of matching file documents
   */
  async searchFiles(searchTerm: string, userId: string): Promise<FileResponseDto[]> {
    const files = await fileDao.searchFiles(userId, searchTerm);
    return files.map(file => this.sanitizeFile(file));
  }

  /**
   * Remove sensitive data from file object
   * 
   * @param file File document
   * @returns Sanitized file object safe for client
   */
  private sanitizeFile(file: IFile): FileResponseDto {
    return sanitizeDocument<FileResponseDto>(file, {
      excludeFields: ["__v"],
      recursive: true,
    });
  }
}

export default new FileService();