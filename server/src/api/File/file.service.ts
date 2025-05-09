import fileDao from "@api/File/file.dao.js";
import {
  CreateFileDto,
  FileResponseDto,
  UpdateFileDto
} from "@api/File/file.dto.js";
import { IFile } from "@api/File/file.model.js";
import folderService from "@api/Folder/folder.service.js";
import { ApiError } from "@utils/apiError.js";
import logger from "@utils/logger.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.js";

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

    // Ensure file name is unique within the folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      fileData.name,
      fileData.type,
      userId,
      folderId
    );

    // Sanitize the name for path consistency
    const sanitizedName = this.sanitizePathSegment(uniqueName);

    // Create the file document
    const file = await fileDao.createFile({
      ...fileData,
      name: uniqueName,
      owner: userId,
      folder: folderId || null,
      // Using flat storage, so the path is directly in user directory
      path: `/${sanitizedName}`,
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


  async getUserFilesByFolders(
    userId: string,
    folderId?: string | null,
    isDeleted?: boolean
  ): Promise<FileResponseDto[]> {
    const files = await fileDao.getUserFilesByFolders(userId, folderId, isDeleted);
    
    // Return empty array instead of throwing error when no files are found
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
      throw new ApiError(404, [{ id: "File not found" }]);
    }
    
    // Check ownership
    if (file.owner.toString() !== userId) {
      throw new ApiError(403, [{ access: "You don't have permission to access this file" }]);
    }
    
    return this.sanitizeFile(file);
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
      throw new ApiError(500, [{ update: "Failed to update file" }]);
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
      throw new ApiError(500, [{ delete: "Failed to delete file" }]);
    }
    
    // If file was in a folder, decrement the folder's item count
    if (existingFile.folder) {
      await folderService.decrementFolderItemCount(existingFile.folder);
    }
    
    return this.sanitizeFile(deletedFile);
  }

  /**
   * Rename a file
   * 
   * @param fileId File ID to rename
   * @param newName New file name
   * @param userId User ID for ownership verification
   * @returns Updated file document
   */
  async renameFile(fileId: string, newName: string, userId: string): Promise<FileResponseDto> {
    // Verify file exists and user owns it
    const existingFile = await this.getFileById(fileId, userId);
    
    // Ensure name is unique within the folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      newName,
      existingFile.extension,
      userId,
      existingFile.folder
    );
    
    // Calculate the new path - simply update the last segment of the path
    const sanitizedName = this.sanitizePathSegment(uniqueName);
    const newPath = `/${sanitizedName}`;
    
    // Update the file
    const updatedFile = await fileDao.updateFile(fileId, {
      name: uniqueName,
      path: newPath
    });
    
    if (!updatedFile) {
      throw new ApiError(500, [{ rename: "Failed to rename file" }]);
    }
    
    return this.sanitizeFile(updatedFile);
  }
  
  /**
   * Move a file to a new parent folder
   * 
   * @param fileId File ID to move
   * @param newParentId New parent folder ID or null for root
   * @param userId User ID for ownership verification
   * @returns Updated file document
   */
  async moveFile(fileId: string, newParentId: string | null, userId: string): Promise<FileResponseDto> {
    // Verify file exists and user owns it
    const existingFile = await this.getFileById(fileId, userId);
    
    // Verify the destination folder exists and user owns it (if not moving to root)
    let parentFolder = null;
    let newPathSegments: { name: string; id: string }[] = [];
    
    if (newParentId) {
      // Get the destination folder
      parentFolder = await folderService.getFolderById(newParentId, userId);
      if (!parentFolder) {
        throw new ApiError(404, [{ folder: "Destination folder not found" }]);
      }
      
      // Use the parent's pathSegments for the file
      newPathSegments = [...parentFolder.pathSegments];
    }
    
    // Ensure name is unique within the new parent folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      existingFile.name,
      existingFile.extension,
      userId,
      newParentId
    );
    
    // Sanitize the name for path consistency
    const sanitizedName = this.sanitizePathSegment(uniqueName);
    
    // Calculate new path
    const newPath = newParentId && parentFolder 
      ? `${parentFolder.path}/${sanitizedName}` 
      : `/${sanitizedName}`;
    
    // If file was in a folder, decrement that folder's item count
    if (existingFile.folder) {
      await folderService.decrementFolderItemCount(existingFile.folder);
    }
    
    // Update the file
    const updatedFile = await fileDao.updateFile(fileId, {
      name: uniqueName,
      folder: newParentId,
      path: newPath,
      pathSegments: newPathSegments
    });
    
    if (!updatedFile) {
      throw new ApiError(500, [{ move: "Failed to move file" }]);
    }
    
    // If file is moved to a folder, increment that folder's item count
    if (newParentId) {
      await folderService.incrementFolderItemCount(newParentId);
    }
    
    return this.sanitizeFile(updatedFile);
  }

  /**
   * Ensure a file name is unique within a folder by appending a counter if needed
   * Similar to how folder names are made unique
   * 
   * @param name Original file name without extension
   * @param extension File extension
   * @param ownerId User ID who owns the file
   * @param folderId Optional folder ID where the file will be placed
   * @returns Unique file name (without extension)
   */
  private async ensureUniqueNameAtLevel(
    name: string,
    extension: string,
    ownerId: string,
    folderId?: string | null
  ): Promise<string> {
    let finalName = name;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      // Check if a file with this name already exists in the same folder
      const existingFile = await fileDao.checkFileExists(
        finalName,
        extension,
        ownerId,
        folderId || null
      );

      if (!existingFile) {
        isUnique = true;
      } else {
        // If exists, append counter in parentheses and try again
        counter++;
        finalName = `${name} (${counter})`;
      }
    }

    return finalName;
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
  
  /**
   * Helper to sanitize path segments - replaces spaces with hyphens and removes invalid chars
   * Keeping consistent with the folder path sanitization
   * 
   * @param name Name to sanitize for path use
   * @returns Sanitized name suitable for paths
   */
  private sanitizePathSegment(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[\/\\:*?"<>|]/g, "") // Remove invalid filesystem characters
      .toLowerCase(); // Lowercase for consistency
  }
}

export default new FileService();