import fileService from "@api/file/file.service.js";
import folderDao from "@api/folder/folder.dao.js";
import {
  CreateFolderDto,
  FolderResponseDto,
  FolderResponseWithFilesDto,
  MoveFolderDto,
  PaginatedPinContentsDto,
  PathSegment,
  RenameFolderDto,
  UpdateFolderDto,
} from "@api/folder/folder.dto.js";
import { IFolder } from "@api/folder/folder.model.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";
import { sanitizeFilename } from "@utils/sanitize.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import mongoose, { Types } from "mongoose";
import userService from "@api/user/user.service.js";

/**
 * Business logic for folder operations
 */
class FolderService {
  /**
   * Create folder with unique name
   */
  async createFolder(
    folderData: CreateFolderDto,
    userId: string,
    duplicateAction?: "replace" | "keepBoth"
  ): Promise<FolderResponseDto> {
    const sanitizedName = sanitizeFilename(folderData.name);

    // Check if folder exists
    const existingFolder = await folderDao.findFolderByName(sanitizedName, userId, folderData.parent || null);

    if (existingFolder) {
      if (!duplicateAction) {
        throw new ApiError(409, [{ 
          name: `A folder with the name "${sanitizedName}" already exists in this location` 
        }]);
      }

      if (duplicateAction === "replace") {
        // Delete the existing folder and all its contents
        await this.permanentDeleteFolder(existingFolder._id.toString(), userId);
      } else if (duplicateAction === "keepBoth") {
        // Find a unique name by appending a number
        let counter = 1;
        while (await this.checkFolderNameExists(`${sanitizedName} (${counter})`, userId, folderData.parent || null)) {
          counter++;
        }
        folderData.name = `${sanitizedName} (${counter})`;
      }
    }

    const folder = await folderDao.createFolder({
      ...folderData,
      name: folderData.name,
      owner: new Types.ObjectId(userId),
      parent: folderData.parent ? new Types.ObjectId(folderData.parent) : null,
    });

    return this.sanitizeFolder(folder);
  }

  /**
   * Make folder name unique in parent by adding counter
   * @param name - Base folder name
   * @param userId - Owner ID
   * @param parentId - Parent folder
   * @returns Deduplicated name
   */
  private async ensureUniqueNameAtLevel(
    name: string,
    userId: string,
    parentId: string | null
  ): Promise<string> {
    let finalName = name;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      // Check if a folder with this name already exists under the same parent
      const existingFolder = await folderDao.checkFolderExists(
        finalName,
        userId,
        parentId
      );

      if (!existingFolder) {
        isUnique = true;
      } else {
        // If exists, append counter in parentheses and try again
        counter++;
        finalName = `${name} (${counter})`;
      }
    }

    return finalName;
  }

  /**
   * Check folder ownership permission
   * @param folderId - Target folder
   * @param userId - Expected owner
   * @param includeDeleted - Include trashed folders
   * @throws Owner mismatch or not found
   */
  async verifyFolderOwnership(
    folderId: string,
    userId: string,
    includeDeleted: boolean = true
  ): Promise<IFolder> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      throw new ApiError(400, [{ folder: "Invalid folder ID" }]);
    }

    const folder = await folderDao.getFolderById(folderId, includeDeleted);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    // Check if the folder belongs to the user
    if (folder.owner.toString() !== userId) {
      logger.debug(`Owner mismatch: ${folder.owner} !== ${userId}`);
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this folder" },
      ]);
    }

    return folder;
  }

  /**
   * List folder's direct children
   * @param folderId - Target folder or null for root
   * @param userId - Folder owner
   * @param includeDeleted - Include trashed items
   * @returns Files and subfolders
   */
  async getFolderContents(
    folderId: string | null,
    userId: string,
    includeDeleted: boolean = false
  ): Promise<FolderResponseWithFilesDto> {
    // Build path segments for the breadcrumb navigation
    const pathSegments = await this.buildPathSegments(folderId, userId);
    
    // If folderId is null, return only folders with parent null and files with folder null
    if (!folderId) {
      const rootFolders = await folderDao.getUserFoldersWithCounts(userId, null, includeDeleted);
      const rootFiles = await fileService.getUserFilesByFolders(userId, null, includeDeleted);
      return {
        folders: rootFolders.map((folder) => ({
          ...this.sanitizeFolder(folder),
          hasDeletedAncestor: false // Root folders can't have deleted ancestors
        })),
        files: rootFiles.map(file => ({
          ...file,
          hasDeletedAncestor: false // Root files can't have deleted ancestors
        })),
        pathSegments
      };
    }

    // Get the folder first to check if it's deleted
    const folder = await folderDao.getFolderById(folderId, true);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    // Check ownership
    if (folder.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this folder" },
      ]);
    }

    // macOS behavior: If viewing a deleted folder, show its contents as they were
    // before deletion. The contents are still nested inside the folder structure.
    const shouldIncludeDeleted = includeDeleted || folder.deletedAt !== null;

    // Get only immediate children: folders with parent = folderId, files with folder = folderId
    const folders = await folderDao.getUserFoldersWithCounts(userId, folderId, shouldIncludeDeleted);
    const files = await fileService.getUserFilesByFolders(userId, folderId, shouldIncludeDeleted);

    // Check if any ancestor is deleted OR if the current folder itself is deleted
    const hasDeletedAncestor = folder.deletedAt !== null || await this.hasDeletedAncestor(folderId);

    return {
      folders: folders.map((folder) => ({
        ...this.sanitizeFolder(folder),
        hasDeletedAncestor // Pass the ancestor check result to all children
      })),
      files: files.map(file => ({
        ...file,
        hasDeletedAncestor // Pass the ancestor check result to all children
      })),
      pathSegments
    };
  }

  async getFolderByNameAndParent(
    name: string,
    parentId: string | null,
    ownerId: string
  ): Promise<FolderResponseDto | null> {
    const folder = await folderDao.checkFolderExists(name, ownerId, parentId);
    return folder ? this.sanitizeFolder(folder) : null;
  }

  /**
   * Get single folder by ID
   * @param folderId - Target folder
   * @param userId - Requesting user
   * @param includeDeleted - Include trashed
   * @throws Not found or unauthorized
   */
  async getFolderById(folderId: string, userId: string): Promise<FolderResponseDto> {
    // Verify folder exists and belongs to user
    const folder = await folderDao.getFolderWithCount(folderId);
    
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    
    if (folder.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authentication: "You do not have permission to access this folder" },
      ]);
    }
    
    // Check if any ancestor is deleted OR if the current folder itself is deleted
    const hasDeletedAncestor = folder.deletedAt !== null || await this.hasDeletedAncestor(folderId);

    return {
      ...this.sanitizeFolder(folder),
      hasDeletedAncestor
    };
  }

  /**
   * Check if a folder name exists in the given parent
   */
  private async checkFolderNameExists(
    name: string,
    userId: string,
    parentId: string | null,
    currentFolderId?: string
  ): Promise<boolean> {
    // If we're renaming a folder to its current name, return false (no conflict)
    if (currentFolderId) {
      const currentFolder = await this.getFolderById(currentFolderId, userId);
      if (currentFolder && currentFolder.name === name) {
        return false;
      }
    }

    const existingFolder = await folderDao.findFolderByName(name, userId, parentId);
    return !!existingFolder;
  }

  /**
   * Change folder name
   * @param folderId - Target folder
   * @param renameData - New name
   * @param userId - Folder owner
   * @param duplicateAction - How to handle duplicate names
   * @returns Updated folder
   */
  async renameFolder(
    folderId: string,
    renameData: RenameFolderDto,
    userId: string,
    duplicateAction?: "replace" | "keepBoth"
  ): Promise<FolderResponseDto> {
    // Get the folder to rename
    const folder = await this.getFolderById(folderId, userId);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    // If the new name is the same as the current name, return the folder unchanged
    if (folder.name === renameData.name) {
      return folder;
    }

    // Check if a folder with the new name already exists
    const existingFolder = await folderDao.findFolderByName(renameData.name, userId, folder.parent);

    if (existingFolder) {
      if (!duplicateAction) {
        throw new ApiError(409, [{ name: "A folder with this name already exists" }]);
      }

      if (duplicateAction === "replace") {
        // Delete the existing folder and all its contents
        await this.permanentDeleteFolder(existingFolder._id.toString(), userId);
      } else if (duplicateAction === "keepBoth") {
        // If keepBoth is selected, don't change anything
        const originalFolder = await folderDao.getFolderById(folderId);
        if (!originalFolder) {
          throw new ApiError(404, [{ folder: "Folder not found" }]);
        }
        return this.sanitizeFolder(originalFolder);
      }
    }

    // Update the folder
    const updatedFolder = await folderDao.renameFolder(folderId, renameData);
    if (!updatedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    return this.sanitizeFolder(updatedFolder);
  }

  /**
   * Move folder to new location
   * @param folderId - Target folder
   * @param moveData - New parent folder
   * @param userId - Folder owner
   * @throws Circular nesting or unauthorized
   */
  async moveFolder(
    folderId: string,
    moveData: MoveFolderDto,
    userId: string
  ): Promise<FolderResponseDto> {
    const folder = await this.getFolderById(folderId, userId);

    // If moving to a parent folder, verify it exists and user has access
    if (moveData.parent) {
      const targetFolder = await folderDao.getFolderById(moveData.parent);
      if (!targetFolder) {
        throw new ApiError(404, [{ folder: "Target folder not found" }]);
      }

      if (targetFolder.owner.toString() !== userId) {
        throw new ApiError(403, [
          { authorization: "You do not have permission to access this folder" },
        ]);
      }

      // Prevent moving folder into itself or its descendants
      const descendants = await folderDao.getAllDescendantFolders(folderId);
      if (
        moveData.parent === folderId ||
        descendants.includes(moveData.parent)
      ) {
        throw new ApiError(400, [
          { folder: "Cannot move a folder into itself or its descendants" },
        ]);
      }
    }

    // Check if a folder with the same name already exists in the target location
    const existingFolder = await folderDao.findFolderByName(
      folder.name,
      userId,
      moveData.parent
    );

    if (existingFolder) {
      if (!moveData.duplicateAction) {
        throw new ApiError(409, [{ 
          name: `A folder with the name "${folder.name}" already exists in this location`,
          type: "folder",
          folderName: folder.name
        }]);
      }

      if (moveData.duplicateAction === "replace") {
        // Delete the existing folder and all its contents
        await this.permanentDeleteFolder(existingFolder._id.toString(), userId);
      } else if (moveData.duplicateAction === "keepBoth") {
        // Generate a unique name for the folder being moved
        const uniqueName = await this.ensureUniqueNameAtLevel(
          folder.name,
          userId,
          moveData.parent
        );
        
        // Move the folder with the unique name
        const updatedFolder = await folderDao.moveFolder(folderId, {
          ...moveData,
          name: uniqueName,
        });
        
        if (!updatedFolder) {
          throw new ApiError(404, [{ folder: "Folder not found" }]);
        }
        
        return this.sanitizeFolder(updatedFolder);
      }
    }

    // Update the folder with original name (no conflict or replace action)
    const updatedFolder = await folderDao.moveFolder(folderId, {
      ...moveData,
      name: folder.name,
    });

    if (!updatedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(updatedFolder);
  }

  /**
   * Update a folder with the provided data
   *
   * @param folderId ID of the folder to update
   * @param updateData Object containing the fields to update
   * @param userId ID of the user who should own the folder
   * @returns Updated folder
   */
  async updateFolder(
    folderId: string,
    updateData: UpdateFolderDto,
    userId: string
  ): Promise<FolderResponseDto> {
    //verify folder ownership

    const updatedFolder = await folderDao.updateFolder(folderId, updateData);
    if (!updatedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(updatedFolder);
  }

  /**
   * Check for nested folder relationship
   * @param folderId - Parent to check
   * @param potentialDescendantId - Possible child
   * @returns Is descendant
   */
  private async isFolderDescendant(
    folderId: string,
    potentialDescendantId: string
  ): Promise<boolean> {
    // Get all descendants of the potential parent folder
    const descendants = await folderDao.getAllDescendantFolders(folderId);

    logger.info("Descendants of folderId:", folderId, descendants);
    // Check if our target folder is among the descendants
    return descendants.some((descendantId) => {
      return descendantId === potentialDescendantId;
    });
  }

  /**
   * Clean folder data for client response
   */
  private sanitizeFolder(folder: IFolder): FolderResponseDto {
    return sanitizeDocument(folder, {
      excludeFields: ["__v"],
      recursive: true,
    });
  }

  /**
   * Generate folder breadcrumb trail
   * @param folderId - Current folder
   * @param userId - Folder owner
   * @returns Path segments to root
   */
  private async buildPathSegments(
    folderId: string | null, 
    userId: string
  ): Promise<PathSegment[]> {
    // If we're getting trash contents, use a different path
    if (!folderId) {
      // If we're at root, return the root segment
      return [{ id: null, name: "Root" }];
    }
    
    let currentFolder = await folderDao.getFolderById(folderId, true); // Include deleted folders
    logger.info("Initial folder:", currentFolder);
    
    if (!currentFolder) {
      logger.info("Initial folder not found");
      return [{ id: null, name: "Root" }];
    }

    // Check if the current folder is deleted or has deleted ancestors
    const isDeleted = currentFolder.deletedAt !== null;
    const hasDeletedAncestor = isDeleted || await this.hasDeletedAncestor(folderId);
    
    // If the folder or any of its ancestors is in trash, we should show Trash in the breadcrumb path
    if (isDeleted || hasDeletedAncestor) {
      const pathSegments: PathSegment[] = [
        { id: null, name: "Trash" }
      ];
      
      // For deleted folders, only show the folder itself without ancestors
      if (isDeleted) {
        pathSegments.push({
          id: currentFolder._id.toString(),
          name: currentFolder.name
        });
        
        logger.info("Folder is in trash, path segments:", pathSegments);
        return pathSegments;
      }

      // For folders with deleted ancestors, create path starting from the Trash
      const folderSegments: PathSegment[] = [];
      
      // Add the current folder
      folderSegments.unshift({
        id: currentFolder._id.toString(),
        name: currentFolder.name
      });
      
      // Find the first deleted ancestor to represent the trash root
      let trashRootFolder = null;
      let tempFolder = currentFolder;
      
      while (tempFolder && tempFolder.parent) {
        // Get parent folder
        const parentId = typeof tempFolder.parent === 'string' ? 
          tempFolder.parent : 
          (tempFolder.parent._id ? tempFolder.parent._id.toString() : tempFolder.parent.toString());
        
        const parentFolder = await folderDao.getFolderById(parentId, true);
        
        if (!parentFolder) {
          break;
        }

        // If we found a deleted parent, this is our trash root
        if (parentFolder.deletedAt !== null) {
          trashRootFolder = parentFolder;
          break;
        }
        
        // Add this ancestor to the path and continue up
        folderSegments.unshift({
          id: parentFolder._id.toString(),
          name: parentFolder.name
        });
        
        tempFolder = parentFolder;
      }
      
      // Add the trash root folder if found
      if (trashRootFolder) {
        pathSegments.push({
          id: trashRootFolder._id.toString(),
          name: trashRootFolder.name
        });
      }
      
      // Add the rest of the folders
      const finalPath = [...pathSegments, ...folderSegments];
      logger.info("Final trash path segments:", finalPath);
      return finalPath;
    }
    
    // Regular case: folder is not in trash
    const pathSegments: PathSegment[] = [
      { id: null, name: "Root" }
    ];
    
    const folderSegments: PathSegment[] = [];
    
    // Build the path by traversing up the folder hierarchy
    while (currentFolder) {
      logger.info("Current folder in path:", {
        id: currentFolder._id.toString(),
        name: currentFolder.name,
        parent: currentFolder.parent
      });
      
      // Add the current folder to segments
      folderSegments.unshift({
        id: currentFolder._id.toString(),
        name: currentFolder.name
      });
      
      // If no parent, we've reached the root
      if (!currentFolder.parent) {
        logger.info("Reached root folder");
        break;
      }
      
      // If parent is populated (an object), use it directly
      if (typeof currentFolder.parent === 'object' && currentFolder.parent !== null && 'name' in currentFolder.parent) {
        // Cast to unknown first to avoid type errors
        currentFolder = currentFolder.parent as unknown as IFolder;
      } else {
        // Otherwise, fetch the parent folder
        const parentId = currentFolder.parent.toString();
        logger.info("Getting parent folder:", parentId);
        currentFolder = await folderDao.getFolderById(parentId, true);
      }
      
      // If parent doesn't exist, stop traversing
      if (!currentFolder) {
        logger.info("Parent folder not found");
        break;
      }
    }
    
    // Combine the root segment with folder segments
    const finalPath = [...pathSegments, ...folderSegments];
    logger.info("Final path segments:", finalPath);
    return finalPath;
  }

  /**
   * Move folder to trash (macOS behavior)
   * Only the folder itself is moved to trash, contents remain nested inside
   * @param folderId - Target folder
   * @param userId - Folder owner
   * @returns Trashed folder
   */
  async softDeleteFolder(
    folderId: string,
    userId: string
  ): Promise<FolderResponseDto> {
    // Get the folder with includeDeleted=false to ensure we only delete non-deleted folders
    const folder = await folderDao.getFolderById(folderId, false);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    // Verify ownership
    if (folder.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this folder" },
      ]);
    }
    
    // macOS behavior: Only move the folder itself to trash, not its contents
    // The contents remain nested inside the folder and will only appear in trash
    // if they were deleted separately before the parent folder was deleted
    const deletedFolder = await folderDao.softDeleteFolder(folderId);

    if (!deletedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(deletedFolder);
  }

  /**
   * Delete folder and contents permanently (macOS behavior)
   * @param folderId - Target folder
   * @param userId - Folder owner
   * @throws Delete operation failed
   */
  async permanentDeleteFolder(folderId: string, userId: string): Promise<void> {
    // Try to verify folder exists and user owns it, but allow it to not exist during bulk operations
    let folder;
    try {
      folder = await this.verifyFolderOwnership(folderId, userId);
    } catch (error) {
      // If folder is not found during bulk delete, it may have already been deleted
      if (error instanceof ApiError && error.statusCode === 404) {
        logger.info(`Folder ${folderId} not found during permanent delete - may already be deleted`);
        return; // Exit gracefully since folder is already gone
      }
      // Re-throw other errors (like permission errors)
      throw error;
    }
    
    if (!folder) {
      // Folder doesn't exist, nothing to delete
      return;
    }

    // Get all descendant folders recursively
    const descendantFolderIds = await folderDao.getAllDescendantFolders(folderId, true);
    
    // Include the target folder itself
    const allFolderIds = [folderId, ...descendantFolderIds];
    
    // For each folder (including target and descendants):
    // 1. Get all files in the folder
    // 2. Delete files from storage and DB
    // 3. Delete the folder from DB
    for (const curFolderId of allFolderIds) {
      try {
        // Get all files in this folder
        const files = await fileService.getUserFilesByFolders(userId, curFolderId, true);
        
        // Delete each file (both storage and DB)
        for (const file of files) {
          await fileService.permanentDeleteFile(file.id, userId);
        }
        
        // Delete the folder from DB
        const result = await folderDao.permanentDeleteFolder(curFolderId);
        if (!result) {
          logger.error(`Failed to delete folder ${curFolderId} from database`);
        }
      } catch (error) {
        logger.error(`Error deleting folder ${curFolderId} contents:`, error);
        // Continue with other folders even if one fails
      }
    }
  }

  /**
   * Restore folder from trash (macOS behavior)
   * @param folderId - Target folder
   * @param userId - Folder owner
   * @throws Not in trash or unauthorized
   */
  async restoreFolder(
    folderId: string,
    userId: string
  ): Promise<FolderResponseDto> {
    // Find the folder (including deleted ones)
    const folder = await folderDao.getFolderById(folderId, true);

    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    if (folder.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authentication: "You do not have permission to restore this folder" },
      ]);
    }

    if (folder.deletedAt === null) {
      throw new ApiError(400, [{ folder: "Folder is not in trash" }]);
    }

    // macOS behavior: Check if original parent exists and is not deleted
    let shouldMoveToRoot = false;
    if (folder.parent) {
      try {
        // Get the parent ID correctly, handling both string and object cases
        const parentId = typeof folder.parent === 'string' ? 
          folder.parent : 
          (folder.parent._id ? folder.parent._id.toString() : folder.parent.toString());

        // Include deleted folders in the search to properly check the parent's state
        const parentFolder = await folderDao.getFolderById(parentId, true);
        logger.info("Parent folder check:", {
          folderId,
          parentId,
          parentExists: !!parentFolder,
          parentDeletedAt: parentFolder?.deletedAt
        });
        
        if (!parentFolder || parentFolder.deletedAt !== null) {
          // macOS behavior: If original parent doesn't exist or is deleted, 
          // prevent restoration with error message
          throw new ApiError(400, [{ 
            folder: `Cannot restore '${folder.name}' because the original location no longer exists or has been moved to Trash.` 
          }]);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error; // Re-throw our custom error
        }
        // If there's an unexpected error checking the parent, prevent restoration
        logger.error(`Error checking parent folder ${folder.parent} for folder ${folderId}:`, error);
        throw new ApiError(400, [{ 
          folder: `Cannot restore '${folder.name}' because the original location cannot be verified.` 
        }]);
      }
    }

    // Restore the folder to its original location
    // Note: We don't automatically restore child folders/files - they must be restored separately
    const restoredFolder = await folderDao.restoreDeletedFolder(folderId, shouldMoveToRoot);

    if (!restoredFolder) {
      throw new ApiError(500, [{ folder: "Failed to restore folder" }]);
    }

    return this.sanitizeFolder(restoredFolder);
  }

  /**
   * Permanently clear user's trash
   * @param userId - Target user
   * @returns Deletion stats
   */
  async emptyTrash(userId: string): Promise<{
    acknowledged: boolean;
    filesDeleted: number;
    foldersDeleted: number;
  }> {
    // Get all folders that were explicitly deleted (have deletedAt timestamp)
    const deletedFolders = await folderDao.getUserDeletedFolders(userId);
    let totalFoldersDeleted = 0;
    let totalSizeFreed = 0;

    // For each deleted folder, delete it and all its descendants (like permanentDeleteFolder does)
    for (const folder of deletedFolders) {
      const folderId = folder._id.toString();
      
      // Get all descendant folders (including those without deletedAt)
      const descendants = await folderDao.getAllDescendantFolders(folderId, true);

      // Delete all files in this folder and descendant folders
      for (const descendantId of [...descendants, folderId]) {
        const files = await fileService.getUserFilesByFolders(userId, descendantId, true); // Include deleted files
        for (const file of files) {
          try {
            totalSizeFreed += file.size;
            await fileService.permanentDeleteFile(file.id, userId);
          } catch (error) {
            logger.error(`Failed to delete file ${file.id}:`, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Delete all descendant folders (reverse order to delete children first)
      for (const descendantId of descendants.reverse()) {
        await folderDao.permanentDeleteFolder(descendantId);
        totalFoldersDeleted++;
      }

      // Finally, delete the folder itself
      const deleted = await folderDao.permanentDeleteFolder(folderId);
      if (deleted) {
        totalFoldersDeleted++;
      }
    }

    // Delete all explicitly deleted files
    await fileService.permanentDeleteAllDeletedFiles(userId);

    // Update user's storage usage if files were deleted (include deleted users since this might be during permanent cleanup)
    if (totalSizeFreed > 0) {
      await userService.updateUserStorageUsage(userId, -totalSizeFreed, true);
    }

    return {
      acknowledged: true,
      filesDeleted: 0, // Since we can't get the count anymore
      foldersDeleted: totalFoldersDeleted,
    };
  }

  /**
   * List user's trashed items (macOS style flat list)
   * @param userId - Target user
   * @returns Deleted files and folders in flat list
   */
  async getTrashContents(userId: string): Promise<FolderResponseWithFilesDto> {
    // Get all deleted folders for this user
    const allDeletedFolders = await folderDao.getUserDeletedFolders(userId);
    
    // Get all deleted files for this user
    const allDeletedFiles = await fileService.getAllDeletedFiles(userId);

    // macOS behavior: Show flat list of deleted items
    // Only show items that were directly deleted, not items that became inaccessible
    // due to parent folder deletion
    
    // For folders: only show folders that were explicitly deleted
    // (not folders that became unreachable due to parent deletion)
    const directlyDeletedFolders = allDeletedFolders.filter(folder => {
      // A folder is "directly deleted" if it has a deletedAt timestamp
      return folder.deletedAt !== null;
    });

    // For files: only show files that were explicitly deleted
    // (not files that became unreachable due to folder deletion)
    const directlyDeletedFiles = allDeletedFiles.filter(file => {
      // A file is "directly deleted" if it has a deletedAt timestamp
      return file.deletedAt !== null;
    });

    // Get item counts for all deleted folders
    const itemsMap = await folderDao.getFolderCounts(directlyDeletedFolders.map(f => f._id.toString()));

    // Return flat list - no hierarchy in trash
    return {
      folders: directlyDeletedFolders.map((folder) => ({
        ...this.sanitizeFolder(folder),
        items: itemsMap.get(folder._id.toString()) || 0
      })),
      files: directlyDeletedFiles,
      pathSegments: [{ id: null, name: "Trash" }]
    };
  }

  /**
   * Get user's pinned items (both folders and files)
   * @param userId - Target user
   * @param offset - Number of items to skip for pagination
   * @param limit - Maximum number of items to return (default 10)
   * @returns Pinned files and folders in flat list
   */
  async getPinContents(
    userId: string, 
    offset: number = 0, 
    limit: number = 10
  ): Promise<PaginatedPinContentsDto> {
    // Get pinned folders for this user
    const allPinnedFolders = await folderDao.getUserFolders(userId, undefined, false);
    const pinnedFolders = allPinnedFolders.filter(folder => folder.isPinned);
    
    // Get pinned files for this user
    const allPinnedFiles = await fileService.getUserFilesByFolders(userId, undefined, false);
    const pinnedFiles = allPinnedFiles.filter(file => file.isPinned);

    // Combine and sort by updatedAt (most recent first)
    const allPinnedItems = [
      ...pinnedFolders.map(folder => ({ ...this.sanitizeFolder(folder), itemType: 'folder' as const, updatedAt: folder.updatedAt })),
      ...pinnedFiles.map(file => ({ ...file, itemType: 'file' as const }))
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Apply pagination
    const paginatedItems = allPinnedItems.slice(offset, offset + limit);

    // Separate back into folders and files
    const resultFolders = paginatedItems
      .filter(item => item.itemType === 'folder')
      .map(item => {
        const { itemType, ...folder } = item;
        return folder;
      });
    
    const resultFiles = paginatedItems
      .filter(item => item.itemType === 'file')
      .map(item => {
        const { itemType, ...file } = item;
        return file;
      });

    return {
      folders: resultFolders,
      files: resultFiles,
      pathSegments: [{ id: null, name: "Pinned" }],
      totalCount: allPinnedItems.length,
      hasMore: offset + limit < allPinnedItems.length
    };
  }

  /**
   * List user's folders in parent
   * @param userId - Target user
   * @param parentId - Parent folder
   * @param includeDeleted - Include trashed
   */
  async getUserFolders(
    userId: string,
    parentId?: string | null,
    includeDeleted: boolean = false
  ): Promise<FolderResponseDto[]> {
    const folders = await folderDao.getUserFolders(userId, parentId, includeDeleted);
    return folders.map((folder) => this.sanitizeFolder(folder));
  }

  /**
   * List user's trashed folders
   * @param userId - Target user
   */
  async getUserDeletedFolders(userId: string): Promise<FolderResponseDto[]> {
    const folders = await folderDao.getUserDeletedFolders(userId);
    return folders.map((folder) => this.sanitizeFolder(folder));
  }

  /**
   * Delete all trashed folders permanently
   * @param userId - Target user
   * @throws Delete operation failed
   */
  async permanentDeleteAllDeletedFolders(userId: string): Promise<void> {
    const result = await folderDao.permanentDeleteAllDeletedFolders(userId);
    if (!result.acknowledged) {
      throw new ApiError(500, [{ folder: "Failed to delete folders" }]);
    }
  }

  /**
   * Get folder creation analytics by date range
   * @param startDate - Start date for analytics (YYYY-MM-DD format)
   * @param endDate - End date for analytics (YYYY-MM-DD format)
   * @returns Array of daily folder creation counts
   */
  async getFolderCreationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<{ date: string; count: number }[]> {

    const analytics = await folderDao.getFolderCreationAnalytics(startDate, endDate);
    
    // Return empty array instead of throwing error when no data found
    // This is better UX - no data is a valid state, not an error
    if (!analytics || analytics.length === 0) {
      logger.debug(`No folder creation analytics found for date range ${startDate} to ${endDate}`);
      return [];
    }

    return analytics.map(item => ({
      date: item.date,
      count: item.count
    }));
  }

  /**
   * Manually move folder from trash to any location (macOS drag behavior)
   * @param folderId - Target folder to move
   * @param newParentId - New parent folder ID (null for root)
   * @param userId - Folder owner
   * @returns Moved folder
   */
  async moveFromTrash(
    folderId: string,
    newParentId: string | null,
    userId: string
  ): Promise<FolderResponseDto> {
    // Find the folder (must be in trash)
    const folder = await folderDao.getFolderById(folderId, true);

    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    if (folder.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to move this folder" },
      ]);
    }

    if (folder.deletedAt === null) {
      throw new ApiError(400, [{ folder: "Folder is not in trash" }]);
    }

    // If moving to a specific parent, verify it exists and is not deleted
    if (newParentId) {
      const targetFolder = await folderDao.getFolderById(newParentId, false);
      if (!targetFolder) {
        throw new ApiError(404, [{ folder: "Target folder not found" }]);
      }

      if (targetFolder.owner.toString() !== userId) {
        throw new ApiError(403, [
          { authorization: "You do not have permission to access the target folder" },
        ]);
      }

      // Prevent moving folder into itself or its descendants
      const descendants = await folderDao.getAllDescendantFolders(folderId, true);
      if (newParentId === folderId || descendants.includes(newParentId)) {
        throw new ApiError(400, [
          { folder: "Cannot move a folder into itself or its descendants" },
        ]);
      }
    }

    // Restore the folder and move it to the new location in one operation
    const restoredFolder = await folderDao.restoreDeletedFolder(folderId, false);
    if (!restoredFolder) {
      throw new ApiError(500, [{ folder: "Failed to restore folder" }]);
    }

    // Update the parent
    const movedFolder = await folderDao.moveFolder(folderId, { parent: newParentId, name: folder.name });
    if (!movedFolder) {
      throw new ApiError(500, [{ folder: "Failed to move folder" }]);
    }

    return this.sanitizeFolder(movedFolder);
  }

  /**
   * Check if any ancestor folder is deleted
   * @param folderId - Target folder ID
   * @returns true if any ancestor is deleted
   */
  async hasDeletedAncestor(folderId: string): Promise<boolean> {
    let currentFolder = await folderDao.getFolderById(folderId, true);
    
    while (currentFolder && currentFolder.parent) {
      // Get parent folder first
      const parentId = typeof currentFolder.parent === 'string' ? 
        currentFolder.parent : 
        (currentFolder.parent._id ? currentFolder.parent._id.toString() : currentFolder.parent.toString());
      
      const parentFolder = await folderDao.getFolderById(parentId, true);
      
      // If parent doesn't exist or is deleted, return true
      if (!parentFolder || parentFolder.deletedAt !== null) {
        return true;
      }
      
      // Move up to parent for next iteration
      currentFolder = parentFolder;
    }
    
    return false;
  }
}

export default new FolderService();
