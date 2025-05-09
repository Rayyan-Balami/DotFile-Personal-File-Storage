import { ApiError } from "@utils/apiError.js";
import { ApiResponse } from "@utils/apiResponse.js";
import asyncHandler from "@utils/asyncHandler.js";
import logger from "@utils/logger.js";
import folderService from "./folder.service.js";

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

  getFolderContents = asyncHandler(async (req, res) => {
    logger.info("Getting folder contents");
    const folderId = req.params.folderId || null;
    
    // Add the owner (current logged in user) from auth middleware
    if (!req.user) {
      throw new ApiError(401, "Unauthorized", ["authentication"]);
    }
    const userId = req.user.id;
    
    const folderContents = await folderService.getFolderContents(folderId, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folderContents }, "Folder contents retrieved successfully"));
  }
  );
}

export default new FolderController();
