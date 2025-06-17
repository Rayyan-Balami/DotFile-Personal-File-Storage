import fileDao from "@api/file/file.dao.js";
import {
  CreateFileDto,
  FileResponseDto,
  UpdateFileDto,
} from "@api/file/file.dto.js";
import { IFile } from "@api/file/file.model.js";
import folderService from "@api/folder/folder.service.js";
import { IUser } from "@api/user/user.model.js";
import userService from "@api/user/user.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import { decryptFileBuffer } from "@utils/cryptoUtil.utils.js"; // Import decryption utility
import logger from "@utils/logger.utils.js";
import { Request } from "express";
import { getUserDirectoryPath } from "@utils/mkdir.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import fs from "fs";
import * as fsPromises from "fs/promises";
import { Types } from "mongoose";
import path from "path";

/**
 * FileService: Business logic layer for file operations
 */
class FileService {
  /**
   * Extract folder ID from a folder field that can be string, ObjectId, or populated IFolder object
   * @param folder - The folder field from a file document
   * @returns Folder ID as string or null
   */
  private extractFolderId(folder: any): string | null {
    if (!folder) return null;

    if (typeof folder === "string") {
      return folder;
    } else if (typeof folder === "object" && "_id" in folder) {
      // It's a populated IFolder object
      return (folder as any)._id.toString();
    } else {
      // It's an ObjectId
      return folder.toString();
    }
  }

  /**
   * Create file record with virtual folder mapping
   * @param fileData - File data including name, type, size, and storage key
   * @param userId - User ID who owns the file
   * @param folderId - Optional virtual folder ID
   * @param duplicateAction - Action to take if a file with the same name exists ("replace" or "keepBoth")
   * @returns Created file document
   */
  async createFileWithVirtualFolder(
    fileData: {
      name: string;
      type: string; // This is the MIME type
      size: number;
      storageKey: string;
    },
    userId: string,
    folderId?: string | null,
    duplicateAction?: "replace" | "keepBoth"
  ): Promise<FileResponseDto> {
    logger.debug(`Creating file record for ${fileData.name} by user ${userId}`);

    // Get the extension from storage key
    const fileExtension = path
      .extname(fileData.storageKey)
      .substring(1)
      .toLowerCase();

    // Check if file already exists
    const existingFile = await fileDao.checkFileExists(
      fileData.name,
      fileExtension,
      userId,
      folderId || null
    );

    // First, ensure the new file exists on disk
    const newFilePath = path.join(
      process.cwd(),
      "uploads",
      `user-${userId}`,
      fileData.storageKey
    );
    try {
      await fsPromises.access(newFilePath);
    } catch (error) {
      throw new ApiError(500, [{ file: "New file not found on disk" }]);
    }

    if (existingFile) {
      if (!duplicateAction) {
        // If no duplicate action specified, we should delete the new file and throw error
        try {
          await fsPromises.unlink(newFilePath);
        } catch (err) {
          logger.error(`Error cleaning up new file ${newFilePath}:`, err);
        }
        throw new ApiError(409, [
          {
            name: `A file named "${fileData.name}.${fileExtension}" already exists in this location`,
          },
        ]);
      }

      if (duplicateAction === "replace") {
        try {
          // First delete the existing file completely using permanentDeleteFile
          // This will handle both disk file and database deletion
          await this.permanentDeleteFile(existingFile._id.toString(), userId);
        } catch (error) {
          // If deletion of old file fails, clean up the new file and throw error
          try {
            await fsPromises.unlink(newFilePath);
          } catch (err) {
            logger.error(`Error cleaning up new file ${newFilePath}:`, err);
          }
          throw error;
        }
      } else if (duplicateAction === "keepBoth") {
        // Find unique name for the new file
        const uniqueName = await this.ensureUniqueNameAtLevel(
          fileData.name,
          fileExtension,
          userId,
          folderId
        );
        fileData.name = uniqueName;
      }
    }

    // Create the file document
    const file = await fileDao.createFile({
      ...fileData,
      name: fileData.name,
      owner: userId,
      folder: folderId || null,
      extension: fileExtension, // Store just the file extension
    });

    return this.sanitizeFile(file);
  }

  /**
   * Verify file ownership by user
   * @param fileId - The ID of the file to check
   * @param userId - The ID of the user who should own the file
   * @returns The file if ownership is verified
   * @throws ApiError if file not found or user is not the owner
   */
  async verifyFileOwnership(fileId: string, userId: string): Promise<IFile> {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new ApiError(400, [{ file: "Invalid file ID" }]);
    }

    const file = await fileDao.getFileById(fileId, true);
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // Check if the file belongs to the user
    if ((file.owner as IUser)._id.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this file" },
      ]);
    }

    return file;
  }

  /**
   * Create file record from uploaded file
   * @param fileData - File data from upload
   * @returns Created file document
   */
  async createFile(fileData: CreateFileDto): Promise<FileResponseDto> {
    logger.debug(`Creating file: ${fileData.name} for user ${fileData.owner}`);

    const file = await fileDao.createFile(fileData);

    return this.sanitizeFile(file);
  }

  /**
   * Get user files by folder with optional deletion filter
   * @param userId - User ID who owns the files
   * @param folderId - Optional folder ID to filter by
   * @param isDeleted - Whether to return deleted files
   * @returns Array of file documents matching criteria
   */
  async getUserFilesByFolders(
    userId: string,
    folderId?: string | null,
    isDeleted?: boolean
  ): Promise<FileResponseDto[]> {
    const files = await fileDao.getUserFilesByFolders(
      userId,
      folderId,
      isDeleted
    );
    // logger.info("User files by folders:", files);

    // Return empty array instead of throwing error when no files are found
    return files.map((file) => this.sanitizeFile(file));
  }

  /**
   * Get file by ID with ownership verification
   * @param fileId - File ID
   * @param userId - User ID for ownership verification
   * @returns File document if found
   * @throws ApiError if file not found or user doesn't own it
   */
  async getFileById(fileId: string, userId: string): Promise<FileResponseDto> {
    if (!Types.ObjectId.isValid(fileId)) {
      throw new ApiError(400, [{ file: "Invalid file ID" }]);
    }

    // Get the file
    const file = await this.verifyFileOwnership(fileId, userId);
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // Check if user owns the file
    if ((file.owner as IUser)._id.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this file" },
      ]);
    }

    return this.sanitizeFile(file);
  }

  /**
   * Update file information with ownership verification
   * @param fileId - File ID to update
   * @param updateData - Data to update
   * @param userId - User ID for ownership verification
   * @returns Updated file document
   * @throws ApiError if file not found, user doesn't own it, or update fails
   */
  async updateFile(
    fileId: string,
    updateData: UpdateFileDto,
    userId: string
  ): Promise<FileResponseDto> {
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
   * Soft delete file with ownership verification (macOS behavior)
   * @param fileId - File ID to delete
   * @param userId - User ID for ownership verification
   * @returns Deleted file document
   * @throws ApiError if file not found, user doesn't own it, or deletion fails
   */
  async softDeleteFile(
    fileId: string,
    userId: string
  ): Promise<FileResponseDto> {
    // Verify file ownership
    const existingFile = await this.getFileById(fileId, userId);

    // macOS behavior: Simply move the file to trash
    // The file retains its original location metadata for restoration
    const deletedFile = await fileDao.softDeleteFile(fileId);

    if (!deletedFile) {
      throw new ApiError(500, [{ delete: "Failed to delete file" }]);
    }

    return this.sanitizeFile(deletedFile);
  }

  /**
   * Rename file with uniqueness check
   * @param fileId - File ID to rename
   * @param newName - New file name
   * @param userId - User ID for ownership verification
   * @returns Updated file document
   */
  async renameFile(
    fileId: string,
    newName: string,
    userId: string,
    duplicateAction?: "replace" | "keepBoth"
  ): Promise<FileResponseDto> {
    // Verify file ownership
    const existingFile = await this.verifyFileOwnership(fileId, userId);
    if (!existingFile) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // If the new name is the same as the current name, return the file unchanged
    if (existingFile.name === newName) {
      return this.sanitizeFile(existingFile);
    }

    // Check if a file with the new name and same extension already exists in the same folder
    const folderId = this.extractFolderId(existingFile.folder);
    const existingFileWithName = await fileDao.checkFileExists(
      newName,
      existingFile.extension,
      userId,
      folderId
    );

    if (existingFileWithName) {
      if (!duplicateAction) {
        throw new ApiError(409, [
          {
            name: `A file with the name "${newName}.${existingFile.extension}" already exists`,
          },
        ]);
      }

      if (duplicateAction === "replace") {
        // Delete the existing file
        await this.permanentDeleteFile(
          existingFileWithName._id.toString(),
          userId
        );
      } else if (duplicateAction === "keepBoth") {
        // If keepBoth is selected, don't change anything
        return this.sanitizeFile(existingFile);
      }
    }

    // Update the file
    const updatedFile = await fileDao.renameFile(fileId, {
      name: newName,
    });

    if (!updatedFile) {
      throw new ApiError(500, [{ rename: "Failed to rename file" }]);
    }

    return this.sanitizeFile(updatedFile);
  }

  /**
   * Move file to new parent folder
   * @param fileId - File ID to move
   * @param newFolderId - New parent folder ID or null for root
   * @param userId - User ID for ownership verification
   * @param duplicateAction - Action to take if a file with the same name exists
   * @returns Updated file document
   */
  async moveFile(
    fileId: string,
    newFolderId: string | null,
    userId: string,
    duplicateAction?: "replace" | "keepBoth"
  ): Promise<FileResponseDto> {
    // Verify file ownership
    const existingFile = await this.getFileById(fileId, userId);
    if (!existingFile) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }
    // Verify the destination folder exists and user owns it (if not moving to root)
    if (newFolderId) {
      // Get the destination folder and verify ownership
      await folderService.verifyFolderOwnership(newFolderId, userId);
    }

    // if moving to same folder, return the file
    if (existingFile.folder) {
      const currentFolderId = this.extractFolderId(existingFile.folder);
      if (currentFolderId === newFolderId) {
        throw new ApiError(400, [
          { move: "File is already in the target folder" },
        ]);
      }
    }

    // Check if a file with the same name already exists in the target folder
    const existingFileInTarget = await fileDao.checkFileExists(
      existingFile.name,
      existingFile.extension,
      userId,
      newFolderId
    );

    if (existingFileInTarget) {
      if (!duplicateAction) {
        throw new ApiError(409, [
          {
            name: `A file with the name "${existingFile.name}" already exists in this location`,
            type: "file",
            fileName: existingFile.name,
          },
        ]);
      }

      if (duplicateAction === "replace") {
        // Delete the existing file
        await fileDao.permanentDeleteFile(existingFileInTarget._id.toString());
      } else if (duplicateAction === "keepBoth") {
        // Generate a unique name for the file being moved
        const uniqueName = await this.ensureUniqueNameAtLevel(
          existingFile.name,
          existingFile.extension,
          userId,
          newFolderId
        );

        // Update the file with the unique name
        const updatedFile = await fileDao.moveFile(fileId, {
          name: uniqueName,
          folder: newFolderId,
        });

        if (!updatedFile) {
          throw new ApiError(500, [{ move: "Failed to move file" }]);
        }

        return this.sanitizeFile(updatedFile);
      }
    }

    // Update the file with original name (no conflict or replace action)
    const updatedFile = await fileDao.moveFile(fileId, {
      name: existingFile.name,
      folder: newFolderId,
    });

    if (!updatedFile) {
      throw new ApiError(500, [{ move: "Failed to move file" }]);
    }

    return this.sanitizeFile(updatedFile);
  }

  /**
   * Process uploaded files with virtual folder mapping
   * @param files - Array of uploaded files from multer middleware
   * @param userId - User ID who owns the files
   * @param folderId - Optional target folder ID
   * @param fileToFolderMap - Map of filenames to their virtual folder paths (for zip extraction)
   * @param duplicateAction - Action to take if a file with the same name exists ("replace" or "keepBoth")
   * @returns Array of processed file results
   */
  async processUploadedFiles(
    files: Express.Multer.File[],
    userId: string,
    folderId: string | null | undefined,
    fileToFolderMap: Record<string, string> = {},
    duplicateAction?: "replace" | "keepBoth"
  ): Promise<FileResponseDto[]> {
    logger.debug(`Processing ${files.length} files in service layer`);

    const uploadResults: Array<FileResponseDto> = [];

    for (const file of files) {
      try {
        if (fileToFolderMap[file.filename]) {
          // File from ZIP archive - use the mapped folder ID directly
          const targetFolderId = fileToFolderMap[file.filename];
          const fileExtension = path.extname(file.originalname).substring(1);
          const fileName = path.basename(
            file.originalname,
            `.${fileExtension}`
          );

          const savedFile = await this.createFileWithVirtualFolder(
            {
              name: fileName,
              type: file.mimetype,
              size: file.size,
              storageKey: file.filename,
            },
            userId,
            targetFolderId,
            duplicateAction
          );

          uploadResults.push(savedFile);
        } else {
          // Regular file upload
          const fileExtension = path.extname(file.originalname).substring(1);
          const fileName = path.basename(
            file.originalname,
            `.${fileExtension}`
          );

          const savedFile = await this.createFileWithVirtualFolder(
            {
              name: fileName,
              type: file.mimetype,
              size: file.size,
              storageKey: file.filename,
            },
            userId,
            folderId,
            duplicateAction
          );

          uploadResults.push(savedFile);
        }
      } catch (fileError) {
        logger.error(
          `Error processing uploaded file ${file.filename}:`,
          fileError
        );
        throw fileError; // Re-throw to handle in controller
      }
    }

    return uploadResults;
  }

  /**
   * Create folder structure based on path segments
   * @param virtualPath - Path string with segments separated by /
   * @param parentFolderId - Initial parent folder ID
   * @param userId - User who owns the folders
   * @param folderCache - Cache map to store created folders
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
   * Ensure file name is unique within folder for the same extension
   * @param name - Original file name without extension
   * @param extension - File extension
   * @param ownerId - User ID who owns the file
   * @param folderId - Optional folder ID where the file will be placed
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
      // Check if a file with this name and extension already exists in the same folder
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
   * Sanitize file document for client response
   * @param file - File document to sanitize
   * @returns Sanitized file response DTO
   */
  private sanitizeFile(file: IFile): FileResponseDto {
    return sanitizeDocument<FileResponseDto>(file, {
      excludeFields: ["__v"],
      recursive: true,
    });
  }

  /**
   * Sanitize path segment by removing invalid characters
   * @param name - Original path segment name
   * @returns Sanitized path segment
   */
  private sanitizePathSegment(name: string): string {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "") // Remove invalid characters
      .replace(/^\.+/, "") // Remove leading dots
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Permanently delete file from database and storage
   * @param fileId - File ID to delete
   * @param userId - User ID for ownership verification
   * @throws ApiError if file not found or deletion fails
   */
  async permanentDeleteFile(fileId: string, userId: string): Promise<void> {
    // First verify the file exists and belongs to the user
    const file = await this.verifyFileOwnership(fileId, userId);

    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // Delete the physical file first
    // Construct proper path relative to project root
    const userStorageDir = path.join(
      process.cwd(),
      "uploads",
      `user-${userId}`
    );
    const filePath = path.join(userStorageDir, file.storageKey);

    try {
      // Check if file exists before attempting to delete
      await fsPromises.access(filePath);
      await fsPromises.unlink(filePath);
      logger.debug(`Physical file deleted: ${filePath}`);
    } catch (error) {
      // If file doesn't exist, log but continue with database deletion
      logger.error(`Error deleting physical file ${filePath}:`, error);
    }

    // Delete from database
    const result = await fileDao.permanentDeleteFile(fileId);

    if (!result.acknowledged || result.deletedCount === 0) {
      throw new ApiError(500, [
        { server: "Failed to delete file from database" },
      ]);
    }

    // Update user's storage usage (include deleted users since this might be during permanent cleanup)
    await userService.updateUserStorageUsage(userId, -file.size, true);
  }

  /**
   * Restore soft-deleted file (macOS behavior)
   * @param fileId - ID of the file to restore
   * @param userId - ID of the user who owns the file
   * @returns The restored file
   * @throws ApiError if file not found or restoration fails
   */
  async restoreFile(fileId: string, userId: string): Promise<FileResponseDto> {
    // Verify file exists and belongs to user (include deleted files in search)
    const file = await fileDao.getFileById(fileId, true);

    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    if ((file.owner as IUser)._id.toString() !== userId) {
      throw new ApiError(403, [
        { authentication: "You do not have permission to restore this file" },
      ]);
    }

    if (file.deletedAt === null) {
      throw new ApiError(400, [{ file: "File is not in trash" }]);
    }

    // macOS behavior: Check if original parent folder still exists and is not deleted
    if (file.folder) {
      try {
        // Handle populated folder object vs ObjectId string
        const folderId = this.extractFolderId(file.folder);
        if (!folderId) {
          throw new ApiError(400, [
            { restore: "File has no folder reference" },
          ]);
        }

        const folder = await folderService.getFolderById(folderId, userId);

        // If folder exists and is not deleted, restoration can proceed to original location
        if (folder && !folder.deletedAt) {
          // Original folder is available, restore to original location
        } else {
          // macOS behavior: If original folder is missing or deleted, prevent restoration
          throw new ApiError(400, [
            {
              file: `Cannot restore '${file.name}.${file.extension}' because the original folder no longer exists or has been moved to Trash.`,
            },
          ]);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error; // Re-throw our custom error
        }
        // If folder lookup fails, prevent restoration
        logger.error(`Error checking folder for file ${fileId}:`, error);
        throw new ApiError(400, [
          {
            file: `Cannot restore '${file.name}.${file.extension}' because the original location cannot be verified.`,
          },
        ]);
      }
    }

    // Restore the file to its original location
    const restoredFile = await fileDao.restoreDeletedFile(fileId);

    if (!restoredFile) {
      throw new ApiError(500, [{ file: "Failed to restore file" }]);
    }

    return this.sanitizeFile(restoredFile);
  }

  /**
   * Get deleted files in specific folder
   * @param userId - ID of the user
   * @param folderId - ID of the folder to check
   * @returns Object containing array of deleted files
   */
  async getDeletedUserFilesByFolders(
    userId: string,
    folderId: string
  ): Promise<{ files: FileResponseDto[] }> {
    // Get deleted files for this user
    const deletedFiles = await fileDao.getDeletedUserFilesByFolders(
      userId,
      folderId
    );

    // Sanitize for response
    const sanitizedFiles = deletedFiles.map((file) => this.sanitizeFile(file));

    return {
      files: sanitizedFiles,
    };
  }

  /**
   * Get all deleted files for user across all folders
   * @param userId - ID of the user
   * @returns Array of all deleted files, regardless of folder
   */
  async getAllDeletedFiles(userId: string): Promise<FileResponseDto[]> {
    // Get all deleted files for this user
    const deletedFiles = await fileDao.getAllDeletedFiles(userId);

    // Sanitize for response
    return deletedFiles.map((file) => this.sanitizeFile(file));
  }

  /**
   * Permanently delete all user's deleted files from storage and database
   * @param userId - ID of the user
   * @throws ApiError if deletion fails
   */
  async permanentDeleteAllDeletedFiles(userId: string): Promise<void> {
    // Get all deleted files for this user
    const deletedFiles = await fileDao.getAllDeletedFiles(userId);

    // Calculate total size to be freed
    const totalSize = deletedFiles.reduce((sum, file) => sum + file.size, 0);

    // remove all files from upload directory
    for (const file of deletedFiles) {
      const userStorageDir = `uploads/user-${userId}`;
      const filePath = path.join(
        process.cwd(),
        userStorageDir,
        file.storageKey
      );
      try {
        // Check if file exists before attempting to delete
        await fsPromises.access(filePath);
        await fsPromises.unlink(filePath);
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

    // Update user's storage usage if files were deleted (include deleted users since this might be during permanent cleanup)
    if (totalSize > 0) {
      await userService.updateUserStorageUsage(userId, -totalSize, true);
    }
  }

  /**
   * Get decrypted file stream for viewing
   * @param fileId - File ID to view
   * @param userId - User ID who owns the file
   * @returns Object containing file stream, mime type, and filename
   * @throws ApiError if file not found or user doesn't own it
   */
  async getFileStream(
    fileId: string,
    userId: string,
    req?: Request
  ): Promise<{ stream: fs.ReadStream; mimeType: string; filename: string }> {
    // Verify file ownership
    const file = await this.verifyFileOwnership(fileId, userId);

    // Construct file path
    const filePath = path.join(getUserDirectoryPath(userId), file.storageKey);

    try {
      // Check if file exists
      await fsPromises.access(filePath);

      // Read the encrypted file content
      const encryptedBuffer = await fsPromises.readFile(filePath);

      // Decrypt the file content using the user's key
      // Pass the request object for detailed algorithm logging if available
      const decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId, req);

      // Log the decrypted data to the console for debugging
      logger.debug(`Decrypted file data (${file.name}.${file.extension}):`);

      // For text files, log the content as string
      if (
        ["txt", "json", "csv", "md", "html", "css", "js", "ts"].includes(
          file.extension.toLowerCase()
        )
      ) {
        // Convert buffer to string and log - limit to 1000 chars to avoid console overflow
        const textContent = decryptedBuffer.toString("utf8");
        logger.debug(
          textContent.length > 1000
            ? `${textContent.substring(0, 1000)}... (truncated, ${textContent.length} chars total)`
            : textContent
        );
      } else {
        // For binary files, just log buffer info
        logger.debug(`Binary data: ${decryptedBuffer.length} bytes`);
      }

      // Create a temporary decrypted file path
      const tempDir = path.join(getUserDirectoryPath(userId), "temp");

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        await fsPromises.mkdir(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `decrypted-${file.storageKey}`);

      // Write the decrypted content to temp file
      await fsPromises.writeFile(tempFilePath, decryptedBuffer);

      // Create read stream from the decrypted temp file
      const stream = fs.createReadStream(tempFilePath);

      // Set up cleanup of temp file after stream ends or on error
      const cleanupTempFile = async () => {
        try {
          // Check if the file exists before attempting to delete
          await fsPromises.access(tempFilePath)
            .then(() => fsPromises.unlink(tempFilePath))
            .catch(err => {
              // File already doesn't exist, which is fine
              logger.debug(`Temp file ${tempFilePath} already deleted or doesn't exist`);
            });
        } catch (err) {
          logger.error(`Error cleaning up temp file ${tempFilePath}:`, err);
        }
      };
      
      // Clean up on different events
      stream.on("end", cleanupTempFile);
      stream.on("error", cleanupTempFile);
      // Also clean up if the connection is closed prematurely
      stream.on("close", cleanupTempFile);

      // Determine mime type from file extension
      const mimeType = file.type || "application/octet-stream";

      return {
        stream,
        mimeType,
        filename: `${file.name}.${file.extension}`,
      };
    } catch (error) {
      logger.error("Error serving file:", error);
      // Clean up temporary file if it exists
      const tempDir = path.join(getUserDirectoryPath(userId), "temp");
      const tempFilePath = path.join(tempDir, `decrypted-${file.storageKey}`);
      
      try {
        // Attempt to clean up the temporary file if it exists
        if (fs.existsSync(tempFilePath)) {
          await fsPromises.unlink(tempFilePath);
        }
      } catch (cleanupError) {
        logger.error(`Failed to clean up temporary file after error: ${cleanupError}`);
      }
      
      // Add error to request logs if request object is provided
      if (req && Array.isArray(req.logEntries)) {
        req.logEntries.push({
          timestamp: new Date().toISOString(),
          component: 'FileService',
          level: 'ERROR',
          message: `Error serving file: ${error instanceof Error ? error.message : String(error)}`
        });
      }
      
      throw new ApiError(404, [
        { file: "File not found or could not be decrypted" },
      ]);
    }
  }

  /**
   * Get recent files for user within last month
   * @param userId - ID of the user
   * @returns Array of recent files
   */
  async getRecentFiles(userId: string): Promise<FileResponseDto[]> {
    // Get recent files for this user
    const recentFiles = await fileDao.getRecentFiles(userId);

    // Sanitize for response
    return recentFiles.map((file) => this.sanitizeFile(file));
  }

  /**
   * Get file creation analytics by date range
   * @param startDate - Start date for analytics (YYYY-MM-DD format)
   * @param endDate - End date for analytics (YYYY-MM-DD format)
   * @returns Array of daily file creation counts
   */
  async getFileCreationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; count: number }[]> {
    const analytics = await fileDao.getFileCreationAnalytics(
      startDate,
      endDate
    );

    // Return empty array instead of throwing error when no data found
    // This is better UX - no data is a valid state, not an error
    if (!analytics || analytics.length === 0) {
      return [];
    }

    return analytics.map((item) => ({
      date: item.date,
      count: item.count,
    }));
  }

  /**
   * Get file count for a specific date range
   * @param startDate - Start date for counting files
   * @param endDate - End date for counting files
   * @returns Number of files created in the date range
   */
  async getFileCountByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    return await fileDao.getFileCountByDateRange(startDate, endDate);
  }

  /**
   * Get total storage size for files in a specific date range
   * @param startDate - Start date for calculating storage
   * @param endDate - End date for calculating storage
   * @returns Total size in bytes for files created in the date range
   */
  async getStorageSizeByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    return await fileDao.getStorageSizeByDateRange(startDate, endDate);
  }

  /**
   * Get file type distribution for analytics
   * @returns Object with MIME types as keys and counts as values
   */
  async getFileTypeDistribution(): Promise<{ [key: string]: number }> {
    return await fileDao.getFileTypeCount();
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
   * @returns Array of matching file DTOs
   */
  async searchFiles(
    userId: string,
    query?: string,
    fileTypes?: string[],
    isPinned?: boolean,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<FileResponseDto[]> {
    const files = await fileDao.searchFiles(
      userId,
      query,
      fileTypes,
      isPinned,
      dateFrom,
      dateTo
    );

    return files.map((file) => this.sanitizeFile(file));
  }

  /**
   * Get algorithm logs for a specific file
   * @param fileId - File ID
   * @returns Empty array since we're no longer caching logs
   */
  async getFileLogs(fileId: string): Promise<any[]> {
    // Logs are no longer cached in memory - returning empty array
    return [];
  }
}

export default new FileService();
