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
   * Verifies that a file belongs to the specified user and includes workspace data
   * 
   * @param fileId The ID of the file to check
   * @param userId The ID of the user who should own the file
   * @returns The file with populated workspace if ownership is verified
   * @throws ApiError if file not found or user is not the owner
   */
  async verifyFileOwnershipWithWorkspace(fileId: string, userId: string): Promise<IFile> {
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      throw new ApiError(400, [{ file: "Invalid file ID" }]);
    }
    
    const file = await fileDao.getFileWithWorkspace(fileId);
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
   * Get user files by folder with optional workspace data
   *
   * @param userId User ID who owns the files
   * @param folderId Optional folder ID to filter by
   * @param isDeleted Whether to return deleted files
   * @param includeWorkspace Whether to include workspace data
   * @returns Array of file documents matching criteria
   */
  async getUserFilesByFolders(
    userId: string,
    folderId?: string | null,
    isDeleted?: boolean,
    includeWorkspace: boolean = false
  ): Promise<FileResponseDto[]> {
    // Get files with or without workspace data
    const files = includeWorkspace
      ? await fileDao.getUserFilesWithWorkspace(userId, folderId, isDeleted)
      : await fileDao.getUserFilesByFolders(userId, folderId, isDeleted);
    
    // Return empty array instead of throwing error when no files are found
    return files.map(file => this.sanitizeFile(file));
  }

  /**
   * Get a file by ID with optional workspace data
   * 
   * @param fileId File ID
   * @param userId User ID for ownership verification
   * @param includeWorkspace Whether to include workspace data in the response
   * @returns File document if found
   * @throws ApiError if file not found or user doesn't own it
   */
  async getFileById(
    fileId: string, 
    userId: string, 
    includeWorkspace: boolean = false
  ): Promise<FileResponseDto> {
    // Verify file ownership and get the file with or without workspace data
    let file;
    
    if (includeWorkspace) {
      file = await this.verifyFileOwnershipWithWorkspace(fileId, userId);
    } else {
      file = await this.verifyFileOwnership(fileId, userId); 
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
  async deleteFile(fileId: string, userId: string): Promise<FileResponseDto> {
    // Verify file ownership
    const existingFile = await this.verifyFileOwnership(fileId, userId);
    
    // Soft delete the file
    const deletedFile = await fileDao.deleteFile(fileId);
    
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
    // Verify file ownership
    const existingFile = await this.verifyFileOwnership(fileId, userId);
    
    // Verify the destination folder exists and user owns it (if not moving to root)
    let parentFolder = null;
    let newPathSegments: { name: string; id: string }[] = [];
    
    if (newParentId) {
      // Get the destination folder and verify ownership
      parentFolder = await folderService.verifyFolderOwnership(newParentId, userId);
      
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
      await folderService.decrementFolderItemCount(existingFile.folder.toString());
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
              storageKey: file.originalname,
              originalPath: virtualPath,
            },
            userId,
            targetFolderId
          );
          
          uploadResults.push({
            id: savedFile.id,
            name: savedFile.name,
            size: savedFile.size,
            folder: targetFolderId || null,
            virtualPath: virtualPath,
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