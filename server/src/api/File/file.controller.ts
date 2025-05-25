import fileService from "@api/file/file.service.js";
import { FolderResponseDto } from "@api/folder/folder.dto.js";
import folderService from "@api/folder/folder.service.js";
import {
  processZipFiles,
  updateUserStorageUsage,
  upload,
} from "@middleware/multer.middleware.js";
import { encryptFiles } from "@middleware/fileEncryption.middleware.js"; // Import the encryption middleware
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import logger from "@utils/logger.utils.js";
import { Request, Response } from "express";

class FileController {
  /**
   * Universal file upload handler that processes both regular files and folders (as zip)
   * This single handler replaces multiple separate upload endpoints
   */
  uploadFiles = [
    upload.array("files"),
    encryptFiles, // Add encryption middleware before processing
    processZipFiles,
    updateUserStorageUsage,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, [{ file: "Unauthorized" }]);
      }
      
      // Safely handle the folderId from the request body
      const folderId = req.body && req.body.folderId ? req.body.folderId : null;
      
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
    }),
  ];

  /**
   * Get a file by ID
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
   * Update a file
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
   * Delete a file
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
   * Rename a file
   */
  renameFile = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Renaming file");
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const { name } = req.body;

    const updatedFile = await fileService.renameFile(fileId, name, userId);

    res.json(
      new ApiResponse(200, { file: updatedFile }, "File renamed successfully")
    );
  });

  /**
   * Move a file to a different folder
   */
  moveFile = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Moving file");
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const { destinationFolderId } = req.body;

    const updatedFile = await fileService.moveFile(fileId, destinationFolderId, userId);

    res.json(
      new ApiResponse(200, { file: updatedFile }, "File moved successfully")
    );
  });

  /**
   * Permanently delete a file from database and storage
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
   * Restore a soft-deleted file
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
   * Stream file for viewing
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
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Pipe file stream to response
    stream.pipe(res);
  });

  /**
   * Download file (forces download instead of inline viewing)
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
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe file stream to response
    stream.pipe(res);
  });

  /**
   * Get user's files, optionally filtered by folder
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

}

export default new FileController();
