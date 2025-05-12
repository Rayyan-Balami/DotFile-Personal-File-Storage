import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import logger from "@utils/logger.utils.js";
import folderService from "./folder.service.js";

class FolderController {
  // Create a new folder
  createFolder = asyncHandler(async (req, res) => {
    logger.info("Creating folder");
    const folderData = req.body;
    
    // Add the owner (current logged in user) from auth middleware
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const newFolder = await folderService.createFolder(folderData, userId);
    res
      .status(201)
      .json(new ApiResponse(201, { folder: newFolder }, "Folder created successfully"));
  });

  getFolderContents = asyncHandler(async (req, res) => {
    logger.info("Getting folder contents");
    const folderId = req.params.id || null;
    
    // Add the owner (current logged in user) from auth middleware
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const folderContents = await folderService.getFolderContents(folderId, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folderContents }, "Folder contents retrieved successfully"));
  });
  
  // Rename a folder
  renameFolder = asyncHandler(async (req, res) => {
    logger.info("Renaming folder");
    const folderId = req.params.id;
    const renameData = req.body;
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const updatedFolder = await folderService.renameFolder(folderId, renameData, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folder: updatedFolder }, "Folder renamed successfully"));
  });
  
  // Move a folder to a new parent
  moveFolder = asyncHandler(async (req, res) => {
    logger.info("Moving folder");
    const folderId = req.params.id;
    const moveData = req.body;
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const updatedFolder = await folderService.moveFolder(folderId, moveData, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folder: updatedFolder }, "Folder moved successfully"));
  });

  // Soft delete a folder (move to trash)
  softDeleteFolder = asyncHandler(async (req, res) => {
    logger.info("Soft deleting folder");
    const folderId = req.params.id;
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const deletedFolder = await folderService.softDeleteFolder(folderId, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folder: deletedFolder }, "Folder moved to trash"));
  });
  
  // Permanently delete a folder
  permanentDeleteFolder = asyncHandler(async (req, res) => {
    logger.info("Permanently deleting folder");
    const folderId = req.params.id;
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const result = await folderService.permanentDeleteFolder(folderId, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { result }, "Folder permanently deleted"));
  });
  
  // Restore a folder from trash
  restoreFolder = asyncHandler(async (req, res) => {
    logger.info("Restoring folder from trash");
    const folderId = req.params.id;
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const restoredFolder = await folderService.restoreFolder(folderId, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folder: restoredFolder }, "Folder restored successfully"));
  });
  

  /**
   * Get all folders in trash
   */
  getTrashFolderContents = asyncHandler(async (req, res) => {
    logger.info("Getting trash folder contents");
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const trashFolders = await folderService.getTrashContents(userId);
    
    res
      .status(200)
      .json(new ApiResponse(200, { folders: trashFolders }, "Trash folder contents retrieved successfully"));
  });

  /**
   * Empty trash - permanently delete all trashed folders
   */
  emptyTrash = asyncHandler(async (req, res) => {
    logger.info("Emptying folder trash");
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    // Get all deleted folders for this user
    const result = await folderService.emptyTrash(userId);
    
    res
      .status(200)
      .json(new ApiResponse(200, { result }, "Folder trash emptied successfully"));
  });
}

export default new FolderController();
