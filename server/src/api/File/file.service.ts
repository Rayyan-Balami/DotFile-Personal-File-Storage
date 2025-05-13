import fileDao from "@api/File/file.dao.js";
import {
  CreateFileDto,
  FileResponseDto,
  UpdateFileDto
} from "@api/File/file.dto.js";
import { IFile } from "@api/File/file.model.js";
import folderService from "@api/Folder/folder.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import path from "path";
import mongoose from "mongoose";
import shareService from "@api/share/share.service.js";
import { IUserSharePermission } from "@api/share/share.dto.js";
import fs from "fs/promises";

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
      path?: string; // Optional path from ZIP files
    },
    userId: string,
    folderId?: string | null
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

    // Construct the file path, incorporating any original path from ZIP
    let filePath = fileData.path ? 
      // For ZIP files, incorporate the virtual path
      `/${fileData.path}/${sanitizedName}` :
      // For regular files, just use the name
      `/${sanitizedName}`;
    
    // Normalize path to avoid any double slashes
    filePath = filePath.replace(/\/+/g, '/');

    // Create the file document
    const file = await fileDao.createFile({
      ...fileData,
      name: uniqueName,
      owner: userId,
      folder: folderId || null,
      path: filePath, // Use the constructed path
      extension: fileData.type || ''
    });
    
    // If file was added to a folder, increment the folder's item count
    if (folderId) {
      await folderService.incrementFolderItemCount(folderId);
    }
    
    return this.sanitizeFile(file);
  }

  /**
   * Verifies that a file belongs to the specified user
   * 
   * @param fileId The ID of the file to check
   * @param userId The ID of the user who should own the file
   * @returns The file if ownership is verified
   * @throws ApiError if file not found or user is not the owner
   */
  async verifyFileOwnership(fileId: string, userId: string): Promise<IFile> {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw new ApiError(400, [{ file: "Invalid file ID" }]);
    }
    
    const file = await fileDao.getFileById(fileId);
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }
    
    // Check if the file belongs to the user
    if (file.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this file" },
      ]);
    }
    
    return file;
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
   * Get user files by folder
   *
   * @param userId User ID who owns the files
   * @param folderId Optional folder ID to filter by
   * @param isDeleted Whether to return deleted files
   * @returns Array of file documents matching criteria
   */
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
  /**
   * Get file by ID with support for shared resources
   * - Checks if user owns the file
   * - If not, checks if file is shared with user with sufficient permissions
   * 
   * @param fileId File ID to retrieve
   * @param userId User ID requesting access
   * @param requiredPermission Optional minimum permission level required
   * @returns File document or error if unauthorized
   */
  async getFileById(
    fileId: string, 
    userId: string,
    requiredPermission?: IUserSharePermission
  ): Promise<FileResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw new ApiError(400, [{ file: "Invalid file ID" }]);
    }
    
    // Get the file
    const file = await fileDao.getFileById(fileId);
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    const fileOwnerId = file.owner.toString();

    // Check if user has permission (either as owner or via shares)
    const permissionResult = await shareService.verifyPermission(
      fileId,
      userId,
      fileOwnerId,
      requiredPermission
    );
    
    if (!permissionResult.hasPermission) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this file" }
      ]);
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
    // Verify file ownership
    await this.verifyFileOwnership(fileId, userId);
    
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
  async softDeleteFile(fileId: string, userId: string): Promise<FileResponseDto> {
    // Verify file ownership
    const existingFile = await this.verifyFileOwnership(fileId, userId);
    
    // Soft delete the file
    const deletedFile = await fileDao.softDeleteFile(fileId);
    
    if (!deletedFile) {
      throw new ApiError(500, [{ delete: "Failed to delete file" }]);
    }
    
    // If file was in a folder, decrement the folder's item count
    if (existingFile.folder) {
      await folderService.decrementFolderItemCount(existingFile.folder.toString());
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
    // Verify file ownership
    const existingFile = await this.verifyFileOwnership(fileId, userId);
    
    // Ensure name is unique within the folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      newName,
      existingFile.extension,
      userId,
      existingFile.folder ? existingFile.folder.toString() : null
    );
    
    // Calculate the new path - preserve the folder path and update just the filename
    const sanitizedName = this.sanitizePathSegment(uniqueName);
    
    // If file is in a folder, preserve its path structure
    let newPath: string;
    if (existingFile.folder) {
      // Split the path into segments and replace just the last part
      const pathSegments = existingFile.path.split('/');
      pathSegments[pathSegments.length - 1] = sanitizedName;
      newPath = pathSegments.join('/');
    } else {
      // For root files, just use the sanitized name
      newPath = `/${sanitizedName}`;
    }
    
    // Update the file
    const updatedFile = await fileDao.renameFile(fileId, {
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
   * @param newFolderId New parent folder ID or null for root
   * @param userId User ID for ownership verification
   * @returns Updated file document
   */
  async moveFile(fileId: string, newFolderId: string | null, userId: string): Promise<FileResponseDto> {
    // Verify file ownership
    const existingFile = await this.verifyFileOwnership(fileId, userId);
    
    // Verify the destination folder exists and user owns it (if not moving to root)
    let parentFolder = null;
    let newPathSegments: { name: string; id: string }[] = [];
    
    if (newFolderId) {
      // Get the destination folder and verify ownership
      parentFolder = await folderService.verifyFolderOwnership(newFolderId, userId);
      
      // Use the parent's pathSegments for the file
      newPathSegments = [...parentFolder.pathSegments.map(segment => ({
        name: segment.name,
        id: segment.id instanceof mongoose.Types.ObjectId ? segment.id.toString() : String(segment.id)
      }))];
    }
    
    // Ensure name is unique within the new parent folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      existingFile.name,
      existingFile.extension,
      userId,
      newFolderId
    );
    
    // Sanitize the name for path consistency
    const sanitizedName = this.sanitizePathSegment(uniqueName);
    
    // Calculate new path
    const newPath = newFolderId && parentFolder 
      ? `${parentFolder.path}/${sanitizedName}` 
      : `/${sanitizedName}`;
    
    // If file was in a folder, decrement that folder's item count
    if (existingFile.folder) {
      await folderService.decrementFolderItemCount(existingFile.folder.toString());
    }
    
    // Update the file
    const updatedFile = await fileDao.moveFile(fileId, {
      name: uniqueName,
      folder: newFolderId,
      path: newPath,
      pathSegments: newPathSegments
    });
    
    if (!updatedFile) {
      throw new ApiError(500, [{ move: "Failed to move file" }]);
    }
    
    // If file is moved to a folder, increment that folder's item count
    if (newFolderId) {
      await folderService.incrementFolderItemCount(newFolderId);
    }
    
    return this.sanitizeFile(updatedFile);
  }

  /**
   * Process uploaded files 
   * 
   * @param files Array of uploaded files from multer middleware
   * @param userId User ID who owns the files
   * @param folderId Optional target folder ID
   * @param fileToFolderMap Map of filenames to their virtual folder paths (for zip extraction)
   * @param virtualFolders Map of paths to folder IDs (for zip extraction)
   * @returns Array of processed file results
   */
  async processUploadedFiles(
    files: Express.Multer.File[],
    userId: string,
    folderId: string | null | undefined,
    fileToFolderMap: Record<string, string> = {},
    virtualFolders: Record<string, string> = {}
  ): Promise<Array<{id: string; name: string; size: number; folder: string | null; virtualPath?: string}>> {
    logger.debug(`Processing ${files.length} files in service layer`);
    
    // Initialize results array
    const uploadResults: Array<{id: string; name: string; size: number; folder: string | null; virtualPath?: string}> = [];
    
    // Create a map for virtual folders from the input object
    const virtualFolderCache = new Map<string, string>(Object.entries(virtualFolders));
    
    // Track processed filenames to avoid duplicates
    const processedFilenames = new Set<string>();
    
    for (const file of files) {
      try {
        // Skip if we've already processed this file
        if (processedFilenames.has(file.filename)) {
          logger.debug(`Skipping duplicate file: ${file.filename}`);
          continue;
        }
        processedFilenames.add(file.filename);
        
        // Check if this file is part of a zip folder structure
        const virtualPath = fileToFolderMap[file.filename];
        
        if (virtualPath) {
          // This file came from a zip with folder structure
          logger.debug(`Processing extracted file: ${file.filename} from path: ${virtualPath}`);
          let targetFolderId: string | null | undefined = folderId;
          
          // If we have a non-root directory path, find the corresponding folder ID
          if (virtualPath !== "." && virtualPath !== "/") {
            // Check if the folder was already created in processZipFiles middleware
            if (virtualFolderCache.has(virtualPath)) {
              targetFolderId = virtualFolderCache.get(virtualPath)!;
            } else {
              // Create folder structure
              targetFolderId = await this.createFolderStructure(
                virtualPath, 
                folderId, 
                userId, 
                virtualFolderCache
              );
            }
          }
          
          // Extract file extension and name
          const fileExtension = path.extname(file.originalname).substring(1);
          const fileName = path.basename(file.originalname, `.${fileExtension}`);
          
          // Create file record in the database
          const savedFile = await this.createFileWithVirtualFolder(
            {
              name: fileName,
              type: fileExtension,
              size: file.size,
              storageKey: file.filename,  // Use file.filename instead of file.originalname to match actual file on disk
              path: virtualPath, // Pass the virtual path to be incorporated into the file path
            },
            userId,
            targetFolderId
          );
          
          uploadResults.push({
            id: savedFile.id,
            name: savedFile.name,
            size: savedFile.size,
            folder: targetFolderId || null,
            virtualPath: virtualPath, // Keep this for backwards compatibility
          });
          
        } else {
          // Regular file upload (not from ZIP)
          const fileExtension = path.extname(file.originalname).substring(1);
          const fileName = path.basename(file.originalname, `.${fileExtension}`);
          
          // Create file record in the database
          const savedFile = await this.createFileWithVirtualFolder(
            {
              name: fileName,
              type: fileExtension,
              size: file.size,
              storageKey: file.filename,
              // No need to pass a path for regular files, it will be constructed from just the filename
            },
            userId,
            folderId
          );
          
          uploadResults.push({
            id: savedFile.id,
            name: savedFile.name,
            size: savedFile.size,
            folder: folderId || null,
          });
        }
      } catch (fileError) {
        logger.error(`Error processing uploaded file ${file.filename}:`, fileError);
        // Continue processing other files
      }
    }
    
    return uploadResults;
  }
  
  /**
   * Helper method to create folder structure based on path segments
   * 
   * @param virtualPath Path string with segments separated by /
   * @param parentFolderId Initial parent folder ID
   * @param userId User who owns the folders
   * @param folderCache Cache map to store created folders
   * @returns ID of the last folder created or found
   */
  private async createFolderStructure(
    virtualPath: string,
    parentFolderId: string | null | undefined,
    userId: string,
    folderCache: Map<string, string>
  ): Promise<string | null> {
    const pathSegments = virtualPath.split("/").filter(Boolean);
    let parentId = parentFolderId || null;
    let currentPath = "";
    
    // Create each folder in the path if it doesn't exist
    for (const segment of pathSegments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      
      // Check if we've already created this folder in this session
      if (folderCache.has(currentPath)) {
        parentId = folderCache.get(currentPath)!;
        continue;
      }
      
      // Check if folder already exists at this path under the parent
      let folder = await folderService.getFolderByNameAndParent(
        segment,
        parentId,
        userId
      );
      
      // Create the folder if it doesn't exist
      if (!folder) {
        folder = await folderService.createFolder(
          { name: segment, parent: parentId },
          userId
        );
      }
      
      // Store folder ID in cache
      folderCache.set(currentPath, folder.id);
      parentId = folder.id;
    }
    
    return parentId;
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
    const sanitized = sanitizeDocument<FileResponseDto>(file, {
      excludeFields: ["__v"],
      recursive: true,
    });
    
    // Calculate isShared property based on publicShare and userShare
    sanitized.isShared = !!(sanitized.publicShare || sanitized.userShare);
    
    return sanitized;
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

  /**
   * Get file with sharing information
   * 
   * @param fileId ID of the file to retrieve
   * @param userId ID of the user making the request
   * @returns File with populated sharing information
   */
  async getFileWithShareInfo(
    fileId: string, 
    userId: string
  ): Promise<FileResponseDto & { shareInfo?: any }> {
    // First verify the user has access to this file
    const file = await this.getFileById(fileId, userId);
    
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }
    
    // Ensure user has permission to access this file
    const permissionResult = await shareService.verifyPermission(
      fileId, 
      userId,
      file.owner.toString()
    );
    
    if (!permissionResult.hasPermission) {
      throw new ApiError(403, [{ permission: "You do not have permission to access this file" }]);
    }
    
    // Create response object with type assertion for shareInfo
    const response = { 
      ...file, 
      shareInfo: { 
        isOwner: permissionResult.isOwner 
      } as any
    };

    // If owner, fetch all sharing information
    if (permissionResult.isOwner) {
      // Get public share if exists
      try {
        const publicShare = await shareService.getPublicShareByResource(fileId, userId);
        if (publicShare) {
          response.shareInfo.public = publicShare;
        }
      } catch (error) {
        // No public share exists - that's fine
      }
      
      // Get user shares if exist
      try {
        const userShare = await shareService.getUserShareByResource(fileId, userId);
        if (userShare) {
          response.shareInfo.users = userShare;
        }
      } catch (error) {
        // No user shares exist - that's fine
      }
    } else {
      // For non-owners, include their specific permissions
      response.shareInfo = {
        ...response.shareInfo,
        permission: permissionResult.permissionLevel,
        allowDownload: permissionResult.allowDownload
      } as any;
    }
    
    return response;
  }

  /**
   * Permanently delete a file from database and storage
   * 
   * @param fileId ID of the file to delete 
   * @param userId ID of the user who owns the file
   * @returns Result of the delete operation
   */
  async permanentDeleteFile(fileId: string, userId: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
    // First verify the file exists and belongs to the user
    const file = await this.verifyFileOwnership(fileId, userId);
    
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // Try to delete the physical file from storage
    try {
      // Build the physical storage path
      const userStorageDir = `uploads/user-${userId}`;
      const filePath = path.join(process.cwd(), userStorageDir, file.storageKey);
      
      // Check if file exists before attempting to delete
      await fs.access(filePath);
      await fs.unlink(filePath);
      logger.debug(`Physical file deleted: ${filePath}`);
    } catch (error) {
      // If file doesn't exist or there's a permission issue, log but continue
      logger.error(`Failed to delete physical file: ${error}`);
    }
    
    // Delete from database
    return await fileDao.permanentDeleteFile(fileId);
  }

  /**
   * Restore a soft-deleted file
   * 
   * @param fileId ID of the file to restore
   * @param userId ID of the user who owns the file
   * @returns The restored file
   */
  async restoreFile(fileId: string, userId: string): Promise<FileResponseDto> {
    // Verify file exists and belongs to user (include deleted files in search)
    const file = await fileDao.getFileById(fileId, true);
    
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }
    
    if (file.owner.toString() !== userId) {
      throw new ApiError(403, [{ authentication: "You do not have permission to restore this file" }]);
    }
    
    if (file.deletedAt === null) {
      throw new ApiError(400, [{ file: "File is not in trash" }]);
    }
    
    // Check if folder still exists (if file was in a folder)
    if (file.folder) {
      try {
        const folder = await folderService.getFolderById(file.folder.toString(), userId);
        
        // If folder exists and is not deleted, increment its item count
        if (folder) {
          await folderService.incrementFolderItemCount(file.folder.toString());
        }
      } catch (error) {
        // If folder is deleted or doesn't exist, move file to root
        file.folder = null;
        file.path = "/";
        file.pathSegments = [];
      }
    }
    
    // Restore the file
    const restoredFile = await fileDao.restoreDeletedFile(fileId);
    
    if (!restoredFile) {
      throw new ApiError(500, [{ file: "Failed to restore file" }]);
    }
    
    return this.sanitizeFile(restoredFile);
  }

  /**
   * Get all files in user's trash
   * 
   * @param userId ID of the user
   * @returns List of deleted files
   */
  async getDeletedUserFilesByFolders(userId: string, folderId: string): Promise<{ files: FileResponseDto[] }> {
    // Get deleted files for this user
    const deletedFiles = await fileDao.getDeletedUserFilesByFolders(userId, folderId);

    // Sanitize for response
    const sanitizedFiles = deletedFiles.map(file => this.sanitizeFile(file));
    
    return {
      files: sanitizedFiles
    };
  }

  /**
   * Get all deleted files for a user
   * 
   * @param userId ID of the user
   * @returns List of all deleted files, regardless of folder
   */
  async getAllDeletedFiles(userId: string): Promise<FileResponseDto[]> {
    // Get all deleted files for this user
    const deletedFiles = await fileDao.getAllDeletedFiles(userId);
    
    // Sanitize for response
    return deletedFiles.map(file => this.sanitizeFile(file));
  }

  async permanentDeleteAllDeletedFiles(userId: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
    // Get all deleted files for this user
    const deletedFiles = await fileDao.getAllDeletedFiles(userId);
    // remove all files from upload directory
    for (const file of deletedFiles) {
            const userStorageDir = `uploads/user-${userId}`;
      const filePath = path.join(process.cwd(), userStorageDir, file.storageKey);
      try {
        // Check if file exists before attempting to delete
        await fs.access(filePath);
        await fs.unlink(filePath);
        logger.debug(`Physical file deleted: ${filePath}`);
      } catch (error) {
        // If file doesn't exist or there's a permission issue, log but continue
        logger.error(`Failed to delete physical file: ${error}`);
      }
    }
    // Permanently delete all files recorded in the database
    const result = await fileDao.permanentDeleteAllDeletedFiles(userId);
    if (!result) {
      throw new ApiError(500, [{ delete: "Failed to empty trash" }]);
    }
    return result;
  }
  /**
   * Bulk update file paths
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
    return await fileDao.bulkUpdateFilePaths(
      oldPathPrefix,
      newPathPrefix,
      pathSegmentsToUpdate
    );
  }
}

export default new FileService();