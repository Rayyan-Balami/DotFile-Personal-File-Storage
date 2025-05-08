import asyncHandler from "@utils/asyncHandler.js";
import folderService from "./folder.service.js";
import { ApiResponse } from "@utils/apiResponse.js";
import { ApiError } from "@utils/apiError.js";
import logger from "@utils/logger.js";
import { GetFoldersQueryDto } from "./folder.dto.js";

class FolderController {
  // Create a new folder
  createFolder = asyncHandler(async (req, res) => {
    logger.info("Creating folder");
    const folderData = req.body;
    
    // Add the owner (current logged in user) from auth middleware
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    const userId = req.user.id;
    
    const newFolder = await folderService.createFolder(folderData, userId);
    res
      .status(201)
      .json(new ApiResponse(201, { folder: newFolder }, "Folder created successfully"));
  });

  // Get a folder by ID
  getFolderById = asyncHandler(async (req, res) => {
    logger.info("Getting folder by ID");
    const folderId = req.params.id;
    
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    const userId = req.user.id;
    
    const folder = await folderService.getFolderById(folderId, userId);
    res.json(new ApiResponse(200, { folder }, "Folder retrieved successfully"));
  });

  // Get all folders with optional filtering
  getFolders = asyncHandler(async (req, res) => {
    logger.info("Getting folders");
    
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    const userId = req.user.id;
    
    // Build query from request parameters
    const query: GetFoldersQueryDto = {};
    
    if (req.query.parent !== undefined) {
      query.parent = req.query.parent === 'null' ? null : (req.query.parent as string);
    }
    
    if (req.query.workspace !== undefined) {
      query.workspace = req.query.workspace === 'null' ? null : (req.query.workspace as string);
    }
    
    if (req.query.isPinned !== undefined) {
      query.isPinned = req.query.isPinned === 'true';
    }
    
    if (req.query.isShared !== undefined) {
      query.isShared = req.query.isShared === 'true';
    }
    
    if (req.query.includeDeleted !== undefined) {
      query.includeDeleted = req.query.includeDeleted === 'true';
    }
    
    const folders = await folderService.getFolders(userId, query);
    res.json(new ApiResponse(200, { folders }, "Folders retrieved successfully"));
  });

  // Update a folder
  updateFolder = asyncHandler(async (req, res) => {
    logger.info("Updating folder");
    const folderId = req.params.id;
    const updateData = req.body;
    
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    const userId = req.user.id;
    
    const updatedFolder = await folderService.updateFolder(folderId, updateData, userId);
    res.json(new ApiResponse(200, { folder: updatedFolder }, "Folder updated successfully"));
  });

  // Delete a folder (soft delete)
  deleteFolder = asyncHandler(async (req, res) => {
    logger.info("Deleting folder");
    const folderId = req.params.id;
    
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    const userId = req.user.id;
    
    const deletedFolder = await folderService.deleteFolder(folderId, userId);
    res.json(new ApiResponse(200, { folder: deletedFolder }, "Folder deleted successfully"));
  });

  // Get contents of a folder (immediate children only)
  getFolderContents = asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    
    // Get folderId from params or use null for root level
    const folderId = req.params.id || null;
    const userId = req.user.id;
    
    const folderContents = await folderService.getFolderContents(folderId, userId);
    res.json(new ApiResponse(200, { contents: folderContents }, "Folder contents retrieved successfully"));
  });
}

export default new FolderController();
