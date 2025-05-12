import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import { Request, Response } from "express";
import folderService from "@api/Folder/folder.service.js";
import fileService from "@api/File/file.service.js";
import logger from "@utils/logger.utils.js";

class TrashController {
  /**
   * Get all trash contents (both files and folders)
   */
  getTrashContents = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Getting trash contents");
    
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    
    // Get both deleted files and folders
    const trashFiles = await fileService.getTrashContents(userId);
    const trashFolders = await folderService.getTrashFolders(userId);
    
    res.status(200).json(
      new ApiResponse(
        200, 
        { 
          files: trashFiles.files,
          folders: trashFolders,
        }, 
        "Trash contents retrieved successfully"
      )
    );
  });

  /**
   * Empty trash - permanently delete all trashed files and folders
   */
  emptyTrash = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Emptying trash");
    
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    
    // Get all deleted files and folders
    const trashFiles = await fileService.getTrashContents(userId);
    const trashFolders = await folderService.getTrashFolders(userId);
    
    // Delete all files
    const fileResults = await Promise.allSettled(
      trashFiles.files.map(file => 
        fileService.permanentDeleteFile(file._id, userId)
      )
    );
    
    // Delete all folders
    const folderResults = await Promise.allSettled(
      trashFolders.map(folder => 
        folderService.permanentDeleteFolder(folder._id, userId)
      )
    );
    
    // Count successful operations
    const deletedFileCount = fileResults.filter(r => r.status === 'fulfilled').length;
    const deletedFolderCount = folderResults.filter(r => r.status === 'fulfilled').length;
    
    res.status(200).json(
      new ApiResponse(
        200, 
        { 
          deletedFileCount,
          deletedFolderCount,
          totalDeleted: deletedFileCount + deletedFolderCount
        }, 
        `Trash emptied: ${deletedFileCount} files and ${deletedFolderCount} folders permanently deleted`
      )
    );
  });
}

export default new TrashController();
