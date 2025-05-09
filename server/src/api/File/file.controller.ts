import { Request, Response } from "express";
import asyncHandler from "@utils/asyncHandler.js";
import { ApiResponse } from "@utils/apiResponse.js";
import { upload, processZipFiles, updateUserStorageUsage } from "@middleware/multer.middleware.js";
import fileService from "@api/File/file.service.js";
import folderService from "@api/Folder/folder.service.js";
import { ApiError } from "@utils/apiError.js";
import path from "path";
import logger from "@utils/logger.js";
import fs from "fs";
import { ZIP_NAME_PREFIX } from "@config/constants.js";

class FileController {
  /**
   * Universal file upload handler that processes both regular files and folders (as zip)
   * This single handler replaces multiple separate upload endpoints
   */
  uploadFiles = [
    upload.array('files'), // Use array for all uploads - even a single file is just an array of one
    processZipFiles,
    updateUserStorageUsage,
    asyncHandler(async (req: Request, res: Response) => {
      // Validate upload
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        throw new ApiError(400, "No files uploaded", ["files"]);
      }
      
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized", ["authentication"]);
      }
      
      const folderId = req.body.folderId || null;
      const files = req.files as Express.Multer.File[];
      const fileToFolderMap = req.fileToFolderMap || {};
      
      // Process uploaded files to create database records
      const uploadResults = [];
      // Use the virtual folders map created in processZipFiles middleware if available,
      // otherwise initialize a new one
      const virtualFolderCache = new Map<string, string>(
        Object.entries(req.virtualFolders || {})
      );
      
      // The original ZIP files have already been filtered out in the updateUserStorageUsage middleware
      // so now we just need to process all files in the req.files array
      
      for (const file of files) {
        try {
          
          // Check if this file is part of a zip folder structure
          const virtualPath = fileToFolderMap[file.filename];
          
          if (virtualPath) {
            // This file came from a zip with folder structure
            logger.debug(`Processing extracted file: ${file.filename} from path: ${virtualPath}`);
            let targetFolderId = folderId || null;
            
            // If we have a non-root directory path, find the corresponding folder ID
            if (virtualPath !== '.' && virtualPath !== '/') {
              // Check if the folder was already created in processZipFiles middleware
              if (virtualFolderCache.has(virtualPath)) {
                targetFolderId = virtualFolderCache.get(virtualPath)!;
              } else {
                // As a fallback, create folder structure
                const pathSegments = virtualPath.split('/').filter(Boolean);
                let parentId = folderId || null;
                let currentPath = '';
                
                // Create each folder in the path if it doesn't exist
                for (const segment of pathSegments) {
                  currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                  
                  // Check if we've already created this folder in this session
                  if (virtualFolderCache.has(currentPath)) {
                    parentId = virtualFolderCache.get(currentPath)!;
                    continue;
                  }
                  
                  // Check if folder already exists at this path under the parent
                  let folder = await folderService.getFolderByNameAndParent(segment, parentId, userId);
                  
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
            const fileName = path.basename(file.originalname, `.${fileExtension}`);
            
            // Create file record in the database
            const savedFile = await fileService.createFileWithVirtualFolder(
              {
                name: fileName,
                type: fileExtension,
                size: file.size,
                storageKey: file.filename,
                originalPath: virtualPath
              },
              userId,
              targetFolderId
            );
            
            uploadResults.push({
              id: savedFile.id,
              name: savedFile.name,
              size: savedFile.size,
              folder: targetFolderId,
              virtualPath: virtualPath
            });
          } else {
            // Regular file upload (not from ZIP)
            const fileExtension = path.extname(file.originalname).substring(1);
            const fileName = path.basename(file.originalname, `.${fileExtension}`);
            
            const savedFile = await fileService.createFileWithVirtualFolder(
              {
                name: fileName,
                type: fileExtension,
                size: file.size,
                storageKey: file.filename
              },
              userId,
              folderId
            );
            
            uploadResults.push({
              id: savedFile.id,
              name: savedFile.name,
              size: savedFile.size,
              folder: folderId
            });
          }
        } catch (fileError) {
          logger.error(`Error processing uploaded file ${file.filename}:`, fileError);
          // Continue processing other files
        }
      }
      
      res.status(201).json(
        new ApiResponse(201, { 
          files: uploadResults,
          count: uploadResults.length
        }, `Successfully uploaded ${uploadResults.length} file(s)`)
      );
    })
  ];
  
  /**
   * Get files by query
   */
  getFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    const query = req.query as unknown as {
      folder?: string;
      workspace?: string;
      isPinned?: boolean;
      isShared?: boolean;
      includeDeleted?: boolean;
      search?: string;
    };
    
    const files = await fileService.getFiles(query, userId);
    
    res.json(new ApiResponse(200, { files }, "Files retrieved successfully"));
  });
  
  /**
   * Get a file by ID
   */
  getFileById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
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
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    const fileId = req.params.id;
    const updateData = req.body;
    
    const updatedFile = await fileService.updateFile(fileId, updateData, userId);
    
    res.json(new ApiResponse(200, { file: updatedFile }, "File updated successfully"));
  });
  
  /**
   * Delete a file
   */
  deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    const fileId = req.params.id;
    const deletedFile = await fileService.deleteFile(fileId, userId);
    
    res.json(new ApiResponse(200, { file: deletedFile }, "File deleted successfully"));
  });
  
  /**
   * Download a file
   */
  downloadFile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    const fileId = req.params.id;
    const fileInfo = await fileService.getFileDownloadInfo(fileId, userId);
    
    // Check if file exists on disk
    if (!fs.existsSync(fileInfo.path)) {
      throw new ApiError(404, "File not found on disk", ["file"]);
    }
    
    res.download(fileInfo.path, fileInfo.filename);
  });
  
  /**
   * Move files to different folder
   */
  moveFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    const { fileIds, targetFolderId } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new ApiError(400, "File IDs array is required", ["fileIds"]);
    }
    
    const movedCount = await fileService.moveFilesToFolder(
      fileIds, 
      targetFolderId || null,
      userId
    );
    
    res.json(
      new ApiResponse(
        200, 
        { count: movedCount }, 
        `Successfully moved ${movedCount} file(s)`
      )
    );
  });
  
  /**
   * Search files
   */
  searchFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    const { query } = req.query;
    
    if (!query || typeof query !== "string") {
      throw new ApiError(400, "Search query is required", ["query"]);
    }
    
    const files = await fileService.searchFiles(query, userId);
    
    res.json(
      new ApiResponse(
        200, 
        { files, count: files.length }, 
        `Found ${files.length} file(s) matching "${query}"`
      )
    );
  });
}

export default new FileController();