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
    const files = Array.isArray(req.files)
      ? req.files
      : req.files
        ? Array.isArray(req.files.files)
          ? req.files.files
          : Object.values(req.files).flat()
        : [];

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
            folderCount: folderCount,
          },
          `Successfully created ${folderCount} folder(s) from ZIP`
        )
      );
      return;
    }

    logger.debug(
      `Passing ${files.length} files to service layer for processing`
    );

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
          folderCount: folderCount,
        },
        `Successfully uploaded ${uploadResults.length} file(s)${folderCount > 0 ? ` and created ${folderCount} folder(s)` : ""}`,
        req.logEntries // Explicitly include algorithm logs in the response
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

    const updatedFile = await fileService.renameFile(
      fileId,
      name,
      userId,
      duplicateAction
    );

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

    const updatedFile = await fileService.moveFile(
      fileId,
      folder,
      userId,
      duplicateAction
    );

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

    res.json(new ApiResponse(200, { result }, "File permanently deleted"));
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

    // Check if logs are requested explicitly via a query param
    const includeLogsOnly = req.query.logs === 'true';

    const { stream, mimeType, filename } = await fileService.getFileStream(
      req.params.id,
      req.user.id,
      req // Pass the request object for algorithm logging
    );
    
    // If logs are requested only, send them without the file
    if (includeLogsOnly && req.logEntries) {
      return res.json(new ApiResponse(
        200, 
        { filename, mimeType, fileId: req.params.id }, 
        "File decryption logs retrieved successfully",
        req.logEntries // Include algorithm logs in the response
      ));
    }

    // Set headers for streaming
    res.setHeader("Content-Type", mimeType);

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = encodeURIComponent(filename).replace(
      /['()]/g,
      escape
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${sanitizedFilename}`
    );
    
    // Add logs to a custom header if they exist and aren't too large
    if (req.logEntries && req.logEntries.length > 0) {
      try {
        // Filter logs to include only algorithm-related entries
        const algorithmLogs = req.logEntries.filter(log => 
          ['AES', 'Huffman', 'CryptoUtil'].includes(log.component)
        );
        
        // Stringify the logs and add them as a custom header if not too large
        const logsJson = JSON.stringify(algorithmLogs);
        if (logsJson.length < 4096) { // HTTP headers have size limits
          res.setHeader("X-Algorithm-Logs", logsJson);
        }
        
        // Add a header to notify client that logs are available
        res.setHeader("X-Logs-Available", "true");
      } catch (error) {
        // If there's an error stringifying logs, continue without them
        logger.error("Failed to add logs to headers:", error);
      }
    }

    // Pipe file stream to response
    stream.pipe(res);
  });

  /**
   * Forces file download rather than in-browser viewing
   * @param id - File ID to download
   * @returns File as download attachment
   */
  downloadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    // Check if logs are requested explicitly via a query param
    const includeLogsOnly = req.query.logs === 'true';
    
    const { stream, mimeType, filename } = await fileService.getFileStream(
      req.params.id,
      req.user.id,
      req // Pass the request object for algorithm logging
    );
    
    // If logs are requested only, send them without the file
    if (includeLogsOnly && req.logEntries) {
      return res.json(new ApiResponse(
        200, 
        { filename, mimeType, fileId: req.params.id }, 
        "File decryption logs retrieved successfully",
        req.logEntries // Include algorithm logs in the response
      ));
    }

    // Set headers for download instead of viewing
    res.setHeader("Content-Type", mimeType);

    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = encodeURIComponent(filename).replace(
      /['()]/g,
      escape
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${sanitizedFilename}`
    );
    
    // Add logs to a custom header if they exist and aren't too large
    if (req.logEntries && req.logEntries.length > 0) {
      try {
        // Create a new endpoint for logs only
        // Set a flag that logs are available - client can fetch them separately
        res.setHeader("X-Logs-Available", "true");
        
        // Create separate chunk endpoints for large logs
        // Client would need to fetch these separately
        const BASE_LOG_ENDPOINT = `/api/files/${req.params.id}/logs`;
        res.setHeader("X-Logs-Endpoint", BASE_LOG_ENDPOINT);
        
        // Still try to include some logs in headers if not too large
        // Filter logs to include only algorithm-related entries
        const algorithmLogs = req.logEntries.filter(log => 
          ['AES', 'Huffman', 'CryptoUtil'].includes(log.component)
        );
        
        // Select a reasonable subset of logs for headers
        const headerLogs = algorithmLogs.length > 20 
          ? algorithmLogs.filter(log => log.level !== 'DEBUG').slice(0, 20)
          : algorithmLogs;
        
        // Stringify the logs and add them as a custom header if not too large
        const logsJson = JSON.stringify(headerLogs);
        if (logsJson.length < 4000) { // HTTP headers have size limits
          res.setHeader("X-Algorithm-Logs", logsJson);
        }
      } catch (error) {
        // If there's an error stringifying logs, continue without them
        logger.error("Failed to add logs to headers:", error);
      }
    }

    // Include logs directly in response headers if available
    if (req.logEntries && req.logEntries.length > 0) {
      const fileId = req.params.id;
      // Only include logs in the headers if they're not too large
      if (req.logEntries.length <= 20) {
        res.set('X-Algorithm-Logs', JSON.stringify(req.logEntries));
      }
      // Otherwise just set the count
      else {
        res.set('X-Algorithm-Log-Count', String(req.logEntries.length));
      }
    }

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
    const isDeleted = req.query.includeDeleted === "true";

    const files = await fileService.getUserFilesByFolders(
      userId,
      folderId || null,
      isDeleted
    );

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

    res.json(
      new ApiResponse(200, { files }, "Recent files retrieved successfully")
    );
  });

  /**
   * Get algorithm logs for a specific file
   * @returns File logs
   */
  getFileLogs = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    // Get the file first to verify ownership
    const file = await fileService.getFileById(req.params.id, req.user.id);
    if (!file) {
      throw new ApiError(404, [{ file: "File not found" }]);
    }

    // Get logs from memory cache
    const logs = await fileService.getFileLogs(req.params.id);

    if (!logs || logs.length === 0) {
      return res.json(new ApiResponse(
        404,
        null,
        "No logs available for this file",
        []
      ));
    }

    return res.json(new ApiResponse(
      200,
      {
        fileId: req.params.id,
        fileName: file.name,
        logCount: logs.length
      },
      "File logs retrieved successfully",
      logs
    ));
  });
}

export default new FileController();
