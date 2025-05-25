import fileDao from "@api/file/file.dao.js";
import {
  CreateFileDto,
  FileResponseDto,
  UpdateFileDto
} from "@api/file/file.dto.js";
import { IFile } from "@api/file/file.model.js";
import folderService from "@api/folder/folder.service.js";
import { IUser } from "@api/user/user.model.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { getUserDirectoryPath, removeFile } from "@utils/mkdir.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import { decryptFileBuffer } from "@utils/cryptoUtil.utils.js"; // Import decryption utility
import fs from "fs";
import * as fsPromises from "fs/promises";
import { Types } from "mongoose";
import path from "path";
import { deletePreview } from "@middleware/previewGeneration.middleware.js";

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
      hasPreview?: boolean;
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

    // Create the file document
    const file = await fileDao.createFile({
      ...fileData,
      name: uniqueName,
      owner: userId,
      folder: folderId || null,
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
    if (!Types.ObjectId.isValid(fileId)) {
      throw new ApiError(400, [{ file: "Invalid file ID" }]);
    }
    
    const file = await fileDao.getFileById(fileId);
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
      await folderService.incrementFolderItemCount(fileData.folder.toString());
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
    logger.info("User files by folders:", files);

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
  async getFileById(
    fileId: string, 
    userId: string
  ): Promise<FileResponseDto> {
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
    const existingFile = await this.getFileById(fileId, userId);
    
    // Soft delete the file
    const deletedFile = await fileDao.softDeleteFile(fileId);
    
    if (!deletedFile) {
      throw new ApiError(500, [{ delete: "Failed to delete file" }]);
    }
    
    // If file was in a folder, decrement the folder's item count
    if (existingFile.folder) {
      // Safely handle both string IDs and folder objects
      const folderId = typeof existingFile.folder === 'string' ? existingFile.folder : existingFile.folder.id;
      await folderService.decrementFolderItemCount(folderId);
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
    const existingFile = await this.getFileById(fileId, userId);
    
    // Ensure name is unique within the folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      newName,
      existingFile.extension,
      userId,
      existingFile.folder ? (typeof existingFile.folder === 'string' ? existingFile.folder : existingFile.folder.id) : null
    );
    
    // Update the file
    const updatedFile = await fileDao.renameFile(fileId, {
      name: uniqueName
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
      const currentFolderId = typeof existingFile.folder === 'string' ? existingFile.folder : existingFile.folder.id;
      if (currentFolderId === newFolderId) {
        throw new ApiError(400, [{ move: "File is already in the target folder" }]);
      }
    }
    
    // Ensure name is unique within the new parent folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      existingFile.name,
      existingFile.extension,
      userId,
      newFolderId
    );
    
    // If file was in a folder, decrement that folder's item count
    if (existingFile.folder) {
      logger.info("existingFile.folder", existingFile.folder);
      // Safely handle both string IDs and folder objects
      const folderId = typeof existingFile.folder === 'string' ? existingFile.folder : existingFile.folder.id;
      await folderService.decrementFolderItemCount(folderId);
    }
    
    // Update the file
    const updatedFile = await fileDao.moveFile(fileId, {
      name: uniqueName,
      folder: newFolderId
    });
    
    if (!updatedFile) {
      throw new ApiError(500, [{ move: "Failed to move file" }]);
    }
    
    // If file is moved to a folder, increment that folder's item count
    if (newFolderId) {
      logger.info("newFolderId:", newFolderId);
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
   * @param previewResults Map of filenames to preview generation success status
   * @returns Array of processed file results
   */
  async processUploadedFiles(
    files: Express.Multer.File[],
    userId: string,
    folderId: string | null | undefined,
    fileToFolderMap: Record<string, string> = {},
    previewResults: Record<string, boolean> = {},
  ): Promise<FileResponseDto[]> {
    logger.debug(`Processing ${files.length} files in service layer`);
    
    const uploadResults: Array<FileResponseDto> = [];

    for (const file of files) {
      try {
        if (fileToFolderMap[file.filename]) {
          // File from ZIP archive - use the mapped folder ID directly
          const targetFolderId = fileToFolderMap[file.filename];
          const fileExtension = path.extname(file.originalname).substring(1);
          const fileName = path.basename(file.originalname, `.${fileExtension}`);

          const savedFile = await this.createFileWithVirtualFolder(
            {
              name: fileName,
              type: fileExtension,
              size: file.size,
              storageKey: file.filename,
              hasPreview: previewResults[file.filename] || false,
            },
            userId,
            targetFolderId
          );
          
          uploadResults.push(savedFile);
          
        } else {
          // Regular file upload
          const fileExtension = path.extname(file.originalname).substring(1);
          const fileName = path.basename(file.originalname, `.${fileExtension}`);
          
          const savedFile = await this.createFileWithVirtualFolder(
            {
              name: fileName,
              type: fileExtension,
              size: file.size,
              storageKey: file.filename,
              hasPreview: previewResults[file.filename] || false,
            },
            userId,
            folderId
          );
          
          uploadResults.push(savedFile);
        }
      } catch (fileError) {
        logger.error(`Error processing uploaded file ${file.filename}:`, fileError);
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
   * Sanitize file document for client response
   */
  private sanitizeFile(file: IFile): FileResponseDto {
    return sanitizeDocument<FileResponseDto>(file, {
      excludeFields: ["__v"],
      recursive: true,
    });
  }
  
  /**
   * Sanitize a path segment (file or folder name)
   */
  private sanitizePathSegment(name: string): string {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid characters
      .replace(/^\.+/, '')                    // Remove leading dots
      .replace(/\s+/g, ' ')                   // Replace multiple spaces with single space
      .trim();                                // Remove leading/trailing whitespace
  }

  /**
   * Permanently delete a file from database and storage
   */
  async permanentDeleteFile(fileId: string, userId: string): Promise<void> {
    // First verify the file exists and belongs to the user
    const file = await this.verifyFileOwnership(fileId, userId);
    
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // Delete the physical file
    const filePath = path.join(getUserDirectoryPath(userId), file.storageKey);
    const fileDeleted = removeFile(filePath);

    if (!fileDeleted) {
      logger.error(`Failed to delete file ${filePath}`);
    }
    
    // Delete associated preview if it exists
    if (file.hasPreview) {
      const previewDeleted = await deletePreview(userId, file.storageKey);
      if (!previewDeleted) {
        logger.warn(`Failed to delete preview for file ${file.storageKey}`);
      }
    }
    
    // Delete from database
    const result = await fileDao.permanentDeleteFile(fileId);

    if (!result.acknowledged || result.deletedCount === 0) {
      throw new ApiError(500, [
        { server: "Failed to delete file from database" },
      ]);
    }
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
    
    if ((file.owner as IUser)._id.toString() !== userId) {
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

  async permanentDeleteAllDeletedFiles(userId: string): Promise<void> {
    // Get all deleted files for this user
    const deletedFiles = await fileDao.getAllDeletedFiles(userId);
    // remove all files from upload directory
    for (const file of deletedFiles) {
      const userStorageDir = `uploads/user-${userId}`;
      const filePath = path.join(process.cwd(), userStorageDir, file.storageKey);
      try {
        // Check if file exists before attempting to delete
        await fsPromises.access(filePath);
        await fsPromises.unlink(filePath);
        logger.debug(`Physical file deleted: ${filePath}`);
      } catch (error) {
        // If file doesn't exist or there's a permission issue, log but continue
        logger.error(`Failed to delete physical file: ${error}`);
      }

      // Delete associated preview if it exists
      if (file.hasPreview) {
        const previewDeleted = await deletePreview(userId, file.storageKey);
        if (!previewDeleted) {
          logger.warn(`Failed to delete preview for file ${file.storageKey}`);
        }
      }
    }
    // Permanently delete all files recorded in the database
    const result = await fileDao.permanentDeleteAllDeletedFiles(userId);
    if (!result) {
      throw new ApiError(500, [{ delete: "Failed to empty trash" }]);
    }
  }

  /**
   * Get file stream for viewing
   * 
   * @param fileId File ID to view
   * @param userId User ID who owns the file
   * @returns Object containing file stream, mime type, and filename
   * @throws ApiError if file not found or user doesn't own it
   */
  async getFileStream(
    fileId: string,
    userId: string
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
      const decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId);
      
      // Log the decrypted data to the console for debugging
      logger.debug(`Decrypted file data (${file.name}.${file.extension}):`);
      
      // For text files, log the content as string
      if (['txt', 'json', 'csv', 'md', 'html', 'css', 'js', 'ts'].includes(file.extension.toLowerCase())) {
        // Convert buffer to string and log - limit to 1000 chars to avoid console overflow
        const textContent = decryptedBuffer.toString('utf8');
        logger.debug(textContent.length > 1000 
          ? `${textContent.substring(0, 1000)}... (truncated, ${textContent.length} chars total)` 
          : textContent);
      } else {
        // For binary files, just log buffer info
        logger.debug(`Binary data: ${decryptedBuffer.length} bytes`);
      }
      
      // Create a temporary decrypted file path
      const tempDir = path.join(getUserDirectoryPath(userId), 'temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        await fsPromises.mkdir(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `decrypted-${file.storageKey}`);
      
      // Write the decrypted content to temp file
      await fsPromises.writeFile(tempFilePath, decryptedBuffer);
      
      // Create read stream from the decrypted temp file
      const stream = fs.createReadStream(tempFilePath);
      
      // Set up cleanup of temp file after stream ends
      stream.on('end', async () => {
        try {
          // Delete temporary decrypted file after it's been streamed
          await fsPromises.unlink(tempFilePath);
        } catch (err) {
          logger.error(`Error cleaning up temp file ${tempFilePath}:`, err);
        }
      });
      
      // Determine mime type from file extension
      const mimeType = file.type ? 
        `application/${file.type}` : 
        'application/octet-stream';
      
      return {
        stream,
        mimeType,
        filename: `${file.name}.${file.extension}`
      };
    } catch (error) {
      logger.error('Error serving file:', error);
      throw new ApiError(404, [{ file: "File not found or could not be decrypted" }]);
    }
  }

  /**
   * Get preview stream for viewing
   * 
   * @param fileId File ID to get preview for
   * @param userId User ID who owns the file
   * @returns Object containing preview stream, mime type, and filename
   * @throws ApiError if file not found, user doesn't own it, or no preview exists
   */
  async getPreviewStream(
    fileId: string,
    userId: string
  ): Promise<{ stream: fs.ReadStream; mimeType: string; filename: string }> {
    try {
      // Verify file ownership
      const file = await this.verifyFileOwnership(fileId, userId);
      
      // Check if file has a preview
      if (!file.hasPreview) {
        throw new ApiError(404, [{ preview: "No preview available for this file" }]);
      }

      // Get preview file path
      const previewPath = path.join(
        getUserDirectoryPath(userId),
        'previews',
        file.storageKey
      );

      // Check if preview file exists
      if (!fs.existsSync(previewPath)) {
        logger.warn(`Preview file not found: ${previewPath}`);
        throw new ApiError(404, [{ preview: "Preview file not found" }]);
      }

      // Read and decrypt the preview
      const encryptedPreview = await fsPromises.readFile(previewPath);
      const decryptedBuffer = decryptFileBuffer(encryptedPreview, userId);
      
      // Create a temporary file for streaming
      const tempPath = path.join(
        getUserDirectoryPath(userId),
        'temp',
        `preview_${file.storageKey}`
      );
      
      // Ensure temp directory exists
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write decrypted preview to temp file
      await fsPromises.writeFile(tempPath, decryptedBuffer);
      
      // Create read stream
      const stream = fs.createReadStream(tempPath);
      
      // Clean up temp file after streaming
      stream.on('end', () => {
        fs.unlink(tempPath, (err) => {
          if (err) logger.error(`Failed to delete temp preview file: ${err}`);
        });
      });
      
      // Determine mime type - previews are typically images or text
      const mimeType = file.extension.toLowerCase().includes('image') || 
                       ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(`.${file.extension}`) ?
        'image/jpeg' : // Most previews are JPEG images
        'text/plain';  // Text previews
      
      return {
        stream,
        mimeType,
        filename: `preview_${file.name}.${file.extension === 'txt' ? 'txt' : 'jpg'}`
      };
    } catch (error) {
      logger.error('Error serving preview:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(404, [{ preview: "Preview not found or could not be accessed" }]);
    }
  }
}

export default new FileService();