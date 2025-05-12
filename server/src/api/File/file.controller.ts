import fileService from "@api/File/file.service.js";
import {
  processZipFiles,
  updateUserStorageUsage,
  upload,
} from "@middleware/multer.middleware.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import logger from "@utils/logger.utils.js";
import { Request, Response } from "express";
import { MoveFileDto, RenameFileDto } from "./file.dto.js";
class FileController {
  /**
   * Universal file upload handler that processes both regular files and folders (as zip)
   * This single handler replaces multiple separate upload endpoints
   */
  uploadFiles = [
    upload.array("files"), // Use array for all uploads - even a single file is just an array of one
    processZipFiles,
    updateUserStorageUsage,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, [{ file: "Unauthorized" }]);
      }
      
      const folderId = req.body.folderId || null;
      const files = req.files as Express.Multer.File[] || [];
      const fileToFolderMap = req.fileToFolderMap || {};
      const virtualFolders = req.virtualFolders || {};
      
      // Check if we're dealing with a ZIP file that only had folders and no actual files
      const folderKeys = Object.keys(virtualFolders);
      const hasCreatedFolders = folderKeys.length > 0;
      const folderCount = folderKeys.length;
      
      // Validate upload - but allow empty req.files if folders were created from a ZIP
      if (!hasCreatedFolders && (!files || files.length === 0)) {
        throw new ApiError(400, [{ file: "No files uploaded" }]);
      }
      
      // Special case: ZIP with only folders, no files
      if (hasCreatedFolders && (!files || files.length === 0)) {
        logger.debug(`ZIP contained only folders (${folderCount}) with no files`);
        
        res.status(201).json(
          new ApiResponse(
            201,
            {
              files: [],
              folders: virtualFolders,
              count: 0,
              folderCount: folderCount
            },
            `Successfully created ${folderCount} folder(s) from ZIP`
          )
        );
        return;
      }
      
      // Standard case with files
      logger.debug(`Passing ${files.length} files to service layer for processing`);
      
      // Process the files through the service layer
      const uploadResults = await fileService.processUploadedFiles(
        files,
        userId,
        folderId,
        fileToFolderMap,
        virtualFolders
      );

      res.status(201).json(
        new ApiResponse(
          201,
          {
            files: uploadResults,
            folders: hasCreatedFolders ? virtualFolders : undefined,
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
    const renameData: RenameFileDto = req.body;

    const updatedFile = await fileService.renameFile(fileId, renameData.name, userId);

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
    const moveData: MoveFileDto = req.body;

    const updatedFile = await fileService.moveFile(fileId, moveData.folder, userId);

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

}

export default new FileController();
