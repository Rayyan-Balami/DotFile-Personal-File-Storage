import fileService from "@api/file/file.service.js";
import { FolderResponseDto } from "@api/folder/folder.dto.js";
import folderService from "@api/folder/folder.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import logger from "@utils/logger.utils.js";
import { Request, Response } from "express";

/**
 * FileController - Manages file operations including uploads, downloads, and file management
 * Handles both regular file uploads and folder/zip processing with encryption support
 */
class FileController {
  /**
   * Universal file upload handler for both regular files and folders (as zip)
   * @returns Created files and folders with count information
   */
  uploadFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ file: "Unauthorized" }]);
    }
    
    // Safely handle the folderId and duplicateAction from the request body
    const { folderId, duplicateAction } = req.body || {};
    
    // Ensure files is always an array
    const files = Array.isArray(req.files) ? req.files : 
                  (req.files ? Array.isArray(req.files.files) ? req.files.files : 
                  Object.values(req.files).flat() : []);
    
    // Make sure fileToFolderMap and virtualFolders are initialized properly
    const fileToFolderMap = req.fileToFolderMap || {};
    const virtualFolders = req.virtualFolders || {};
    
    const folderKeys = Object.keys(virtualFolders);
    const hasCreatedFolders = folderKeys.length > 0;
    const folderCount = folderKeys.length;
    
    if (!hasCreatedFolders && (!files || files.length === 0)) {
      throw new ApiError(400, [{ file: "No files uploaded" }]);
    }
    
    // Get complete folder information if folders were created 
    let folders: Record<string, FolderResponseDto> = {};
    if (hasCreatedFolders) {
      for (const [path, folderId] of Object.entries(virtualFolders)) {
        const folder = await folderService.getFolderById(folderId, userId);
        folders[path] = folder;
      }
    }
    
    if (hasCreatedFolders && (!files || files.length === 0)) {
      logger.debug(`ZIP contained only folders (${folderCount}) with no files`);
      
      res.status(201).json(
        new ApiResponse(
          201,
          {
            files: [],
            folders,
            count: 0,
            folderCount: folderCount
          },
          `Successfully created ${folderCount} folder(s) from ZIP`
        )
      );
      return;
    }
    
    logger.debug(`Passing ${files.length} files to service layer for processing`);
    
    const uploadResults = await fileService.processUploadedFiles(
      files,
      userId,
      folderId,
      fileToFolderMap || {},
      duplicateAction
    );

    res.status(201).json(
      new ApiResponse(
        201,
        {
          files: uploadResults,
          folders,
          count: uploadResults.length,
          folderCount: folderCount
        },
        `Successfully uploaded ${uploadResults.length} file(s)${folderCount > 0 ? ` and created ${folderCount} folder(s)` : ''}`
      )
    );
  });

  /**
   * Gets single file details by ID
   * @param id - File identifier from route params
   * @returns File object with metadata
   */
  getFileById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const file = await fileService.getFileById(fileId, userId);

    res.json(new ApiResponse(200, { file }, "File retrieved successfully"));
  });

  /**
   * Updates file attributes
   * @param id - File identifier from route params
   * @param body - Object containing file properties to update
   * @returns Updated file object
   */
  updateFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const updateData = req.body;

    const updatedFile = await fileService.updateFile(
      fileId,
      updateData,
      userId
    );

    res.json(
      new ApiResponse(200, { file: updatedFile }, "File updated successfully")
    );
  });

  /**
   * Soft deletes a file (moves to trash)
   * @param id - File identifier from route params
   * @returns The soft-deleted file with updated status
   */
  softDeleteFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const deletedFile = await fileService.softDeleteFile(fileId, userId);

    res.json(
      new ApiResponse(200, { file: deletedFile }, "File deleted successfully")
    );
  });

  /**
   * Renames a file
   * @param id - File identifier from route params
   * @param name - New file name from request body
   * @returns Updated file with new name
   */
  renameFile = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Renaming file");
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const { name, duplicateAction } = req.body;

    const updatedFile = await fileService.renameFile(fileId, name, userId, duplicateAction);

    res.json(
      new ApiResponse(200, { file: updatedFile }, "File renamed successfully")
    );
  });

  /**
   * Moves file to a different folder
   * @param id - File identifier from route params
   * @param folder - Target folder ID from request body
   * @returns Updated file with new folder reference
   */
  moveFile = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Moving file");
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const { folder, name, duplicateAction } = req.body;

    const updatedFile = await fileService.moveFile(fileId, folder, userId, duplicateAction);

    res.json(
      new ApiResponse(200, { file: updatedFile }, "File moved successfully")
    );
  });

  /**
   * Permanently removes file from database and storage
   * @param id - File identifier from route params
   * @returns Operation result status
   */
  permanentDeleteFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }



    const fileId = req.params.id;
    const result = await fileService.permanentDeleteFile(fileId, userId);

    res.json(
      new ApiResponse(200, { result }, "File permanently deleted")
    );
  });

  /**
   * Restores a previously soft-deleted file from trash
   * @param id - File identifier from route params
   * @returns Restored file object
   */
  restoreFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const restoredFile = await fileService.restoreFile(fileId, userId);

    res.json(
      new ApiResponse(200, { file: restoredFile }, "File restored successfully")
    );
  });

  /**
   * Streams file for in-browser viewing
   * @param id - File identifier from route params
   * @returns File stream with inline content-disposition
   */
  viewFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const { stream, mimeType, filename } = await fileService.getFileStream(
      req.params.id,
      req.user.id
    );

    // Set headers for streaming
    res.setHeader('Content-Type', mimeType);
    
    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${sanitizedFilename}`);

    // Pipe file stream to response
    stream.pipe(res);
  });

  /**
   * Forces file download rather than in-browser viewing
   * @param id - File identifier from route params
   * @returns File stream with attachment content-disposition
   */
  downloadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const { stream, mimeType, filename } = await fileService.getFileStream(
      req.params.id,
      req.user.id
    );

    // Set headers for download instead of viewing
    res.setHeader('Content-Type', mimeType);
    
    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${sanitizedFilename}`);

    // Pipe file stream to response
    stream.pipe(res);
  });

  /**
   * Lists user files with optional folder filtering
   * @param folderId - Optional query parameter to filter by folder
   * @param includeDeleted - Optional query parameter to include trashed files
   * @returns Array of file objects matching criteria
   */
  getUserFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const folderId = req.query.folderId as string | undefined;
    logger.info("Folder ID:", folderId);
    const isDeleted = req.query.includeDeleted === 'true';
    
    const files = await fileService.getUserFilesByFolders(userId, folderId || null, isDeleted);
    
    res.json(new ApiResponse(200, { files }, "Files retrieved successfully"));
  });

  /**
   * Get recent files for user
   * @returns Array of recently modified files
   */
  getRecentFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const files = await fileService.getRecentFiles(userId);
    
    res.json(new ApiResponse(200, { files }, "Recent files retrieved successfully"));
  });

}

export default new FileController();
