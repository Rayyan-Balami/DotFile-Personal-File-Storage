import { Request, Response } from "express";
import asyncHandler from "@utils/asyncHandler.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import {
  upload,
  processZipFiles,
  updateUserStorageUsage,
} from "@middleware/multer.middleware.js";
import fileService from "@api/File/file.service.js";
import folderService from "@api/Folder/folder.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import path from "path";
import logger from "@utils/logger.utils.js";
import fs from "fs";
import { ZIP_NAME_PREFIX } from "@config/constants.js";
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
      // Validate upload
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        throw new ApiError(400, [{ file: "No files uploaded" }]);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, [{ file: "Unauthorized" }]);
      }

      const folderId = req.body.folderId || null;
      const files = req.files as Express.Multer.File[];
      const fileToFolderMap = req.fileToFolderMap || {};

      // Debug info - log files being processed
      logger.debug(`Processing ${files.length} files in controller`);
      files.forEach((file, index) => {
        logger.debug(`[${index}] Processing file: ${file.filename}, original: ${file.originalname}`);
      });

      // Process uploaded files to create database records
      const uploadResults = [];
      // Use the virtual folders map created in processZipFiles middleware if available,
      // otherwise initialize a new one
      const virtualFolderCache = new Map<string, string>(
        Object.entries(req.virtualFolders || {})
      );

      // Track processed filenames to avoid duplicates (extra protection)
      const processedFilenames = new Set<string>();

      // The original ZIP files have already been filtered out in the updateUserStorageUsage middleware
      // so now we just need to process all files in the req.files array

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
            logger.debug(
              `Processing extracted file: ${file.filename} from path: ${virtualPath}`
            );
            let targetFolderId = folderId || null;

            // If we have a non-root directory path, find the corresponding folder ID
            if (virtualPath !== "." && virtualPath !== "/") {
              // Check if the folder was already created in processZipFiles middleware
              if (virtualFolderCache.has(virtualPath)) {
                targetFolderId = virtualFolderCache.get(virtualPath)!;
              } else {
                // As a fallback, create folder structure
                const pathSegments = virtualPath.split("/").filter(Boolean);
                let parentId = folderId || null;
                let currentPath = "";

                // Create each folder in the path if it doesn't exist
                for (const segment of pathSegments) {
                  currentPath = currentPath
                    ? `${currentPath}/${segment}`
                    : segment;

                  // Check if we've already created this folder in this session
                  if (virtualFolderCache.has(currentPath)) {
                    parentId = virtualFolderCache.get(currentPath)!;
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
                  virtualFolderCache.set(currentPath, folder.id);
                  parentId = folder.id;
                }

                targetFolderId = parentId;
              }
            }
            // Note: No else needed here - for root-level files in ZIP, we use the provided folderId

            // Extract file extension and name
            const fileExtension = path.extname(file.originalname).substring(1);
            const fileName = path.basename(
              file.originalname,
              `.${fileExtension}`
            );

            // Create file record in the database
            const savedFile = await fileService.createFileWithVirtualFolder(
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
              folder: targetFolderId,
              virtualPath: virtualPath,
            });
          } else {
            // Regular file upload (not from ZIP)
            const fileExtension = path.extname(file.originalname).substring(1);
            const fileName = path.basename(
              file.originalname,
              `.${fileExtension}`
            );

            const savedFile = await fileService.createFileWithVirtualFolder(
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
              folder: folderId,
            });
          }
        } catch (fileError) {
          logger.error(
            `Error processing uploaded file ${file.filename}:`,
            fileError
          );
          // Continue processing other files
        }
      }

      res.status(201).json(
        new ApiResponse(
          201,
          {
            files: uploadResults,
            count: uploadResults.length,
          },
          `Successfully uploaded ${uploadResults.length} file(s)`
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
  deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }

    const fileId = req.params.id;
    const deletedFile = await fileService.deleteFile(fileId, userId);

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

    const updatedFile = await fileService.renameFile(fileId, renameData.newName, userId);

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

    const updatedFile = await fileService.moveFile(fileId, moveData.newParentId, userId);

    res.json(
      new ApiResponse(200, { file: updatedFile }, "File moved successfully")
    );
  });
}

export default new FileController();
