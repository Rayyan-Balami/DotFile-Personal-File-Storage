import folderService from "@api/folder/folder.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import logger from "@utils/logger.utils.js";

/**
 * FolderController: Handles folder CRUD, trash, and hierarchy endpoints
 */
class FolderController {
  /** Create a new folder */
  createFolder = asyncHandler(async (req, res) => {
    logger.info("Creating folder");
    const folderData = {
      name: req.body.name,
      parent: req.body.parent || null
    };
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const folder = await folderService.createFolder(
      folderData, 
      userId,
      req.body.duplicateAction
    );
    
    res
      .status(201)
      .json(new ApiResponse(201, { folder }, "Folder created successfully"));
  });

  /** Get folder by ID */
  getFolderById = asyncHandler(async (req, res) => {
    logger.info("Getting folder by ID");
    const folderId = req.params.id;
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const folder = await folderService.getFolderById(folderId, req.user.id);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    res
      .status(200)
      .json(new ApiResponse(200, { folder }, "Folder retrieved successfully"));
  });


  /** Get contents of a folder */
  getFolderContents = asyncHandler(async (req, res) => {
    logger.info("Getting folder contents");
    const folderId = req.params.id || null;
    const includeDeleted = req.query.includeDeleted === 'true';
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const folderContents = await folderService.getFolderContents(folderId, userId, includeDeleted);
    
    res
      .status(200)
      .json(new ApiResponse(200, { folderContents }, "Folder contents retrieved successfully"));
  });
  
  /** Rename a folder */
  renameFolder = asyncHandler(async (req, res) => {
    logger.info("Renaming folder");
    const folderId = req.params.id;
    const renameData = {
      name: req.body.name
    };
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const updatedFolder = await folderService.renameFolder(
      folderId, 
      renameData, 
      userId,
      req.body.duplicateAction
    );
    
    res
      .status(200)
      .json(new ApiResponse(200, { folder: updatedFolder }, "Folder renamed successfully"));
  });
  
  /** Move folder to new parent */
  moveFolder = asyncHandler(async (req, res) => {
    logger.info("Moving folder");
    const folderId = req.params.id;
    const moveData = {
      parent: req.body.parent,
      name: req.body.name, // Name should come from the request body
      duplicateAction: req.body.duplicateAction
    };
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const updatedFolder = await folderService.moveFolder(folderId, moveData, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folder: updatedFolder }, "Folder moved successfully"));
  });

  /** Soft-delete (trash) a folder */
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
  
  /** Permanently delete a folder */
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
  
  /** Restore folder from trash */
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
   * Get all trashed folders
   */
  getTrashFolderContents = asyncHandler(async (req, res) => {
    logger.info("Getting trash folder contents");
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const trashContents = await folderService.getTrashContents(userId);
    
    res
      .status(200)
      .json(new ApiResponse(200, { 
        folderContents: {
          folders: trashContents.folders,
          files: trashContents.files,
          pathSegments: [
            {
              id: null,
              name: "Trash"
            }
          ]
        }
      }, "Trash folder contents retrieved successfully"));
  });

  /**
   * Empty trash (delete all trashed folders)
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

  /** Update folder (color, pin, etc) */
  updateFolder = asyncHandler(async (req, res) => {
    logger.info("Updating folder");
    const folderId = req.params.id;
    const updateData = {
      color: req.body.color,
      isPinned: req.body.isPinned
    };
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    const updatedFolder = await folderService.updateFolder(folderId, updateData, userId);
    res
      .status(200)
      .json(new ApiResponse(200, { folder: updatedFolder }, "Folder updated successfully"));
  });

  /** Check if folder has deleted ancestors */
  hasDeletedAncestor = asyncHandler(async (req, res) => {
    logger.info("Checking for deleted ancestors");
    const folderId = req.params.id;
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    
    const hasDeletedAncestor = await folderService.hasDeletedAncestor(folderId);
    
    res
      .status(200)
      .json(new ApiResponse(200, { hasDeletedAncestor }, "Ancestor check completed"));
  });
  
  /**
   * Get all pinned items with pagination
   */
  getPinContents = asyncHandler(async (req, res) => {
    logger.info("Getting pin contents");
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    // Parse pagination parameters
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const pinContents = await folderService.getPinContents(userId, offset, limit);
    
    res
      .status(200)
      .json(new ApiResponse(200, { 
        folderContents: {
          folders: pinContents.folders,
          files: pinContents.files,
          pathSegments: pinContents.pathSegments || [{ id: null, name: "Pinned" }]
        },
        pagination: {
          totalCount: pinContents.totalCount,
          hasMore: pinContents.hasMore,
          offset,
          limit
        }
      }, "Pin contents retrieved successfully"));
  });

  /**
   * Search for folders and files
   */
  searchContents = asyncHandler(async (req, res) => {
    logger.info("Searching contents");
    
    if (!req.user) {
      throw new ApiError(401, [{ authentication: "Unauthorized" }]);
    }
    const userId = req.user.id;
    
    // Parse search parameters
    const query = req.query.query as string || "";
    const itemType = req.query.itemType as string || "all"; // all, folders, files
    const fileTypes = req.query.fileTypes ? (req.query.fileTypes as string).split(',') : [];
    const location = req.query.location as string || "myDrive"; // myDrive, trash, recent
    const isPinned = req.query.isPinned === 'true';
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    const searchParams = {
      query,
      itemType,
      fileTypes,
      location,
      isPinned,
      dateFrom,
      dateTo
    };
    
    const searchResults = await folderService.searchContents(userId, searchParams);
    
    res
      .status(200)
      .json(new ApiResponse(200, { 
        folderContents: searchResults
      }, "Search completed successfully"));
  });
}

export default new FolderController();
