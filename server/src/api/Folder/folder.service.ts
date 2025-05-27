import fileDao from "@api/file/file.dao.js";
import fileService from "@api/file/file.service.js";
import folderDao from "@api/folder/folder.dao.js";
import {
  CreateFolderDto,
  FolderResponseDto,
  FolderResponseWithFilesDto,
  MoveFolderDto,
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

    // If folder was added to a parent folder, increment the parent's item count
    if (folderData.parent) {
      await this.incrementParentItemCount(folderData.parent);
    }

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
    includeDeleted: boolean = true
  ): Promise<FolderResponseWithFilesDto> {
    // Build path segments for the breadcrumb navigation
    const pathSegments = await this.buildPathSegments(folderId, userId);
    
    // If folderId is null, return only folders with parent null and files with folder null
    if (!folderId) {
      const rootFolders = await folderDao.getUserFolders(userId, null, includeDeleted);
      const rootFiles = await fileService.getUserFilesByFolders(userId, null, includeDeleted);
      return {
        folders: rootFolders.map((folder) => this.sanitizeFolder(folder)),
        files: rootFiles,
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

    // If viewing a deleted folder, always include deleted children
    const shouldIncludeDeleted = includeDeleted || folder.deletedAt !== null;

    // Get only immediate children: folders with parent = folderId, files with folder = folderId
    const folders = await folderDao.getUserFolders(userId, folderId, shouldIncludeDeleted);
    const files = await fileService.getUserFilesByFolders(userId, folderId, shouldIncludeDeleted);

    return {
      folders: folders.map((folder) => this.sanitizeFolder(folder)),
      files: files,
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
  async getFolderById(
    folderId: string,
    userId: string,
    includeDeleted: boolean = true
  ): Promise<FolderResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      throw new ApiError(400, [{ folder: "Invalid folder ID" }]);
    }

    const folder = await this.verifyFolderOwnership(
      folderId,
      userId,
      includeDeleted
    );

    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(folder);
  }

  /**
   * Increment folder's item counter
   * @param folderId - Target folder
   */
  async incrementFolderItemCount(folderId: string | null): Promise<void> {
    if (folderId) {
      await this.incrementParentItemCount(folderId);
    }
  }

  /**
   * Decrement a folder's item count when an item is removed from it
   * Public method for use by other services
   *
   * @param folderId ID of the folder to update
   */
  async decrementFolderItemCount(folderId: string | null): Promise<void> {
    logger.info("Decrementing folder item count for:", folderId);
    if (folderId) {
      await this.decrementParentItemCount(folderId);
    }
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

    // If moving to a different parent, update item counts
    if (folder.parent?.toString() !== moveData.parent) {
      // Decrement old parent's count if it exists
      if (folder.parent) {
        await this.decrementParentItemCount(folder.parent.toString());
      }
      // Increment new parent's count if it exists
      if (moveData.parent) {
        await this.incrementParentItemCount(moveData.parent);
      }
    }

    // Ensure name is unique in the target location
    const uniqueName = await this.ensureUniqueNameAtLevel(
      folder.name,
      userId,
      moveData.parent
    );

    const updatedFolder = await folderDao.moveFolder(folderId, {
      ...moveData,
      name: uniqueName,
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
    // Always start with root
    const pathSegments: PathSegment[] = [
      { id: null, name: "Root" }
    ];
    
    if (!folderId) {
      // If we're at root, just return the root segment
      return pathSegments;
    }
    
    let currentFolder = await folderDao.getFolderById(folderId, true); // Include deleted folders
    logger.info("Initial folder:", currentFolder);
    
    if (!currentFolder) {
      logger.info("Initial folder not found");
      return pathSegments;
    }
    
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
   * Move folder to trash
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
    
    // Get all descendant folders
    const descendants = await folderDao.getAllDescendantFolders(folderId);
    
    // Soft delete all descendant folders
    for (const descendantId of descendants) {
      await folderDao.softDeleteFolder(descendantId);
    }
    
    // Soft delete all files in this folder and descendant folders
    for (const descendantId of [...descendants, folderId]) {
      const files = await fileService.getUserFilesByFolders(userId, descendantId);
      for (const file of files) {
        try {
          await fileService.softDeleteFile(file.id, userId);
        } catch (error) {
          // Log error but continue with deletion
          logger.error(`Error deleting file ${file.id}:`, error);
        }
      }
    }

    // If folder has a parent, try to decrement its item count
    if (folder.parent) {
      try {
        const parentId = folder.parent.toString();
        await this.decrementParentItemCount(parentId);
      } catch (error) {
        // Log the error but continue with folder deletion
        logger.error("Error updating parent folder count:", error);
      }
    }

    // Finally, soft delete the folder itself while preserving its item count
    const deletedFolder = await folderDao.softDeleteFolder(folderId, folder.items || 0);

    if (!deletedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(deletedFolder);
  }

  /**
   * Delete folder and contents permanently
   * @param folderId - Target folder
   * @param userId - Folder owner
   * @throws Delete operation failed
   */
  async permanentDeleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = await this.getFolderById(folderId, userId);

    // Get all descendant folders
    const descendants = await folderDao.getAllDescendantFolders(folderId);

    // Delete all files in this folder and descendant folders
    for (const descendantId of [...descendants, folderId]) {
      const files = await fileService.getUserFilesByFolders(userId, descendantId, true); // Include deleted files
      for (const file of files) {
        try {
          await fileService.permanentDeleteFile(file.id, userId);
        } catch (error) {
          logger.error(`Failed to delete file ${file.id}:`, error);
          // Continue with other files even if one fails
        }
      }
    }

    // Delete all descendant folders
    for (const descendantId of descendants.reverse()) {
      await folderDao.permanentDeleteFolder(descendantId);
    }

    // Finally, delete the folder itself
    const deleted = await folderDao.permanentDeleteFolder(folderId);
    if (!deleted) {
      throw new ApiError(500, [{ folder: "Failed to delete folder" }]);
    }
  }

  /**
   * Restore folder from trash
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

    // Get all descendant folders
    const descendants = await folderDao.getAllDescendantFolders(folderId);
    
    // Restore all descendant folders
    for (const descendantId of descendants) {
      await folderDao.restoreDeletedFolder(descendantId);
    }
    
    // Restore all files in this folder and descendant folders
    for (const descendantId of [...descendants, folderId]) {
      const files = await fileService.getUserFilesByFolders(userId, descendantId, true);
      for (const file of files) {
        await fileService.restoreFile(file.id, userId);
      }
    }

    // Check if parent exists and is not deleted
    let shouldMoveToRoot = false;
    if (folder.parent) {
      try {
        const parentFolder = await folderDao.getFolderById(folder.parent.toString(), true);
        
        // If parent exists and is not deleted, increment its item count
        if (parentFolder && parentFolder.deletedAt === null) {
          await this.incrementParentItemCount(folder.parent.toString());
        } else {
          // If parent is deleted or doesn't exist, move folder to root
          shouldMoveToRoot = true;
        }
      } catch (error) {
        // If parent is deleted or doesn't exist, move folder to root
        shouldMoveToRoot = true;
      }
    }

    // Restore the folder, optionally moving it to root
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
    // Get all deleted folders for this user
    const deletedFolders =
      await folderDao.permanentDeleteAllDeletedFolders(userId);
    // Get all deleted files for this user
    await fileService.permanentDeleteAllDeletedFiles(userId);

    return {
      acknowledged: true,
      filesDeleted: 0, // Since we can't get the count anymore
      foldersDeleted: deletedFolders.deletedCount,
    };
  }

  /**
   * List user's trashed items
   * @param userId - Target user
   * @returns Deleted files and folders
   */
  async getTrashContents(userId: string): Promise<FolderResponseWithFilesDto> {
    // Get all deleted folders
    const deletedFolders = await folderDao.getUserDeletedFolders(userId);
    
    // Get all deleted files
    const deletedFiles = await fileService.getAllDeletedFiles(userId);

    // Create a set of all folder IDs that are descendants of other deleted folders
    const descendantFolderIds = new Set<string>();
    
    // For each folder, get all its descendants and add them to the set
    for (const folder of deletedFolders) {
      const descendants = await folderDao.getAllDescendantFolders(folder._id.toString());
      descendants.forEach(id => descendantFolderIds.add(id));
    }

    // Filter out folders that are descendants of other deleted folders
    const topLevelDeletedFolders = deletedFolders.filter(
      folder => !descendantFolderIds.has(folder._id.toString())
    );

    // Filter out files that belong to any deleted folder (including descendants)
    const topLevelDeletedFiles = deletedFiles.filter(file => {
      if (!file.folder) return true; // Root level files are always shown
      const folderId = typeof file.folder === 'string' ? file.folder : file.folder.id;
      // Only show files that don't belong to any deleted folder
      return !deletedFolders.some(folder => folder._id.toString() === folderId) && 
             !descendantFolderIds.has(folderId);
    });

    // Return only top-level deleted items
    return {
      folders: topLevelDeletedFolders.map((folder) => this.sanitizeFolder(folder)),
      files: topLevelDeletedFiles,
    };
  }

  /**
   * Increment parent's item counter
   * @param parentId - Parent folder
   * @throws Parent not found
   */
  private async incrementParentItemCount(parentId: string): Promise<void> {
    const parentFolder = await folderDao.getFolderById(parentId);
    if (!parentFolder) {
      throw new ApiError(404, [{ parent: "Parent folder not found" }]);
    }

    // Increment the items count
    await folderDao.updateFolder(parentId, {
      items: (parentFolder.items || 0) + 1,
    });
  }

  /**
   * Decrement parent's item counter
   * @param parentId - Parent folder
   * @throws Parent not found
   */
  private async decrementParentItemCount(parentId: string): Promise<void> {
    logger.info("Decrementing parent item count for:", parentId.toString());
    const parentFolder = await folderDao.getFolderById(parentId);
    logger.info("Parent folder:", parentFolder);
    if (!parentFolder) {
      throw new ApiError(404, [{ parent: "Parent folder not found" }]);
    }

    // Ensure count doesn't go below 0
    await folderDao.updateFolder(parentId, {
      items: Math.max(0, (parentFolder.items || 1) - 1),
    });
  }

  /**
   * List user's folders in parent
   * @param userId - Target user
   * @param parentId - Parent folder
   * @param isDeleted - Include trashed
   */
  async getUserFolders(
    userId: string,
    parentId?: string | null,
    isDeleted: boolean = false
  ): Promise<FolderResponseDto[]> {
    const folders = await folderDao.getUserFolders(userId, parentId, isDeleted);
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
}

export default new FolderService();
