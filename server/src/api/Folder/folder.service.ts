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

class FolderService {
  // Create a new folder
  async createFolder(
    folderData: CreateFolderDto,
    userId: string
  ): Promise<FolderResponseDto> {
    const sanitizedName = sanitizeFilename(folderData.name);

    // Ensure folder name is unique within the parent
    const uniqueName = await this.ensureUniqueNameAtLevel(
      sanitizedName,
      userId,
      folderData.parent || null
    );

    const folder = await folderDao.createFolder({
      ...folderData,
      name: uniqueName,
      owner: new Types.ObjectId(userId),
      parent: folderData.parent ? new Types.ObjectId(folderData.parent) : null,
    });

    return this.sanitizeFolder(folder);
  }

  /**
   * Ensure a folder name is unique within a parent folder by appending a counter if needed
   *
   * @param name Original folder name
   * @param userId User ID who owns the folder
   * @param parentId Optional parent folder ID
   * @returns Unique folder name
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
   * Verifies that a folder belongs to the specified user
   *
   * @param folderId The ID of the folder to check
   * @param userId The ID of the user who should own the folder
   * @param includeDeleted Whether to include deleted folders in the check
   * @returns The folder if ownership is verified
   * @throws ApiError if folder not found or user is not the owner
   */
  async verifyFolderOwnership(
    folderId: string,
    userId: string,
    includeDeleted: boolean = false
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
   * Get the immediate children of a folder (other folders and files)
   *
   * @param folderId ID of the folder to get contents of (null for root level)
   * @param userId ID of the user who should own the folder
   * @returns Folder contents including subfolders and files
   */
  async getFolderContents(
    folderId: string | null,
    userId: string
  ): Promise<FolderResponseWithFilesDto> {
    // Build path segments for the breadcrumb navigation
    const pathSegments = await this.buildPathSegments(folderId, userId);
    
    // if folderId is null then return all the folders and files having null parent (root level)
    if (!folderId) {
      // Get root folders
      const rootFolders = await folderDao.getUserFolders(userId);
      const rootFiles = await fileService.getUserFilesByFolders(userId);
      return {
        folders: rootFolders.map((folder) => this.sanitizeFolder(folder)),
        files: rootFiles,
        pathSegments
      };
    }

    // Verify folder exists and user owns it
    await this.verifyFolderOwnership(folderId, userId, false);

    // Get folders and files for this folder
    const folders = await folderDao.getUserFolders(userId, folderId);
    const files = await fileService.getUserFilesByFolders(userId, folderId);

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
   * Get folder by ID
   *
   * @param folderId Folder ID to retrieve
   * @param userId User ID requesting access
   * @param includeDeleted Whether to include deleted folders
   * @returns Folder document or error if unauthorized
   */
  async getFolderById(
    folderId: string,
    userId: string,
    includeDeleted: boolean = false
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
   * Increment a folder's item count when a new item is added to it
   * Public method for use by other services
   *
   * @param folderId ID of the folder to update
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
   * Rename a folder
   * Updates the folder's name and recursively updates paths for all children
   *
   * @param folderId ID of the folder to rename
   * @param renameData Object containing the new name
   * @param userId ID of the user who owns the folder
   * @returns Updated folder with new name
   */
  async renameFolder(
    folderId: string,
    renameData: RenameFolderDto,
    userId: string
  ): Promise<FolderResponseDto> {
    const folder = await this.getFolderById(folderId, userId);
    const sanitizedNewName = sanitizeFilename(renameData.name);

    // Ensure name is unique within the parent folder
    const uniqueName = await this.ensureUniqueNameAtLevel(
      sanitizedNewName,
      userId,
      folder.parent
    );

    const updatedFolder = await folderDao.renameFolder(folderId, {
      name: uniqueName,
    });

    if (!updatedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(updatedFolder);
  }

  /**
   * Move a folder to a new parent folder
   * Updates the folder's parent and recursively updates paths for all children
   *
   * @param folderId ID of the folder to move
   * @param moveData Object containing the new parent ID
   * @param userId ID of the user who owns the folder
   * @returns Updated folder with new parent and path
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
   * Check if a folder is a descendant of another folder
   * Used to prevent circular references when moving folders
   *
   * @param folderId Potential parent folder ID
   * @param potentialDescendantId Potential child folder ID
   * @returns True if potentialDescendantId is a descendant of folderId
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
   * Sanitize folder document for client response
   */
  private sanitizeFolder(folder: IFolder): FolderResponseDto {
    return sanitizeDocument(folder, {
      excludeFields: ["__v"],
      recursive: true,
    });
  }

  /**
   * Build path segments (breadcrumbs) for a folder
   * 
   * @param folderId ID of the folder to build path for (null for root folder)
   * @param userId ID of the user who owns the folder
   * @returns Array of path segments from root to the current folder
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
    
    let currentFolder = await folderDao.getFolderById(folderId);
    if (!currentFolder || currentFolder.owner.toString() !== userId) {
      return pathSegments;
    }
    
    const folderSegments: PathSegment[] = [];
    
    // Build the path by traversing up the folder hierarchy
    while (currentFolder) {
      folderSegments.unshift({
        id: currentFolder._id.toString(),
        name: currentFolder.name
      });
      
      if (!currentFolder.parent) {
        break;
      }
      
      // Move up to the parent folder
      currentFolder = await folderDao.getFolderById(currentFolder.parent.toString());
      
      // Break if the parent doesn't exist or doesn't belong to the user
      if (!currentFolder || currentFolder.owner.toString() !== userId) {
        break;
      }
    }
    
    // Combine the root segment with folder segments
    return [...pathSegments, ...folderSegments];
  }

  /**
   * Soft delete a folder (move to trash)
   *
   * @param folderId ID of the folder to soft delete
   * @param userId ID of the user who owns the folder
   * @returns The soft-deleted folder
   */
  async softDeleteFolder(
    folderId: string,
    userId: string
  ): Promise<FolderResponseDto> {
    const folder = await this.getFolderById(folderId, userId);
    const deletedFolder = await folderDao.softDeleteFolder(folderId);

    if (!deletedFolder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    return this.sanitizeFolder(deletedFolder);
  }

  /**
   * Permanently delete a folder and its contents
   *
   * @param folderId ID of the folder to permanently delete
   * @param userId ID of the user who owns the folder
   * @returns Result of the delete operation
   */
  async permanentDeleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = await this.getFolderById(folderId, userId);

    // Get all descendant folders
    const descendants = await folderDao.getAllDescendantFolders(folderId);

    // Delete all files in this folder and descendant folders
    for (const descendantId of [...descendants, folderId]) {
      const files = await fileDao.getUserFilesByFolders(userId, descendantId);
      for (const file of files) {
        await fileDao.permanentDeleteFile(file._id.toString());
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
   * Restore a folder from trash
   *
   * @param folderId ID of the folder to restore
   * @param userId ID of the user who owns the folder
   * @returns The restored folder
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

    // If folder has a parent, check if parent exists and is not deleted
    if (folder.parent) {
      try {
        const parentFolder = await this.getFolderById(
          folder.parent.toString(),
          userId,
          false // Don't include deleted folders when checking parent
        );

        // If parent exists and is not deleted, increment its item count
        if (parentFolder) {
          await this.incrementParentItemCount(folder.parent.toString());
        }
      } catch (error) {
        // If parent is deleted or doesn't exist, move folder to root
        folder.parent = null;
      }
    }

    // Restore the folder
    const restoredFolder = await folderDao.restoreDeletedFolder(folderId);

    if (!restoredFolder) {
      throw new ApiError(500, [{ folder: "Failed to restore folder" }]);
    }

    return this.sanitizeFolder(restoredFolder);
  }

  /**
   * Empty the trash by permanently deleting all soft-deleted files and folders
   *
   * @param userId ID of the user whose trash to empty
   * @returns Result of the operation with counts of deleted items
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
   * Get all items in user's trash with support for navigating into deleted folders
   *
   * @param userId ID of the user whose trash to retrieve
   * @param folderId ID of the trash folder to view contents of (null for root trash view)
   * @returns Folder and file contents of the trash or specific deleted folder
   */
  async getTrashContents(userId: string): Promise<FolderResponseWithFilesDto> {
    // Root trash view - show all top-level deleted items
    // Get all deleted folders with null parent (top level) or
    // deleted folders whose parent is not deleted (orphaned)
    const deletedFolders = await folderDao.getUserDeletedFolders(userId);

    // Filter to only include root deleted folders or folders whose parent isn't deleted
    const rootTrashFolders = await Promise.all(
      deletedFolders.map(async (folder) => {
        // If no parent, it's a root folder
        if (!folder.parent) {
          return folder;
        }

        // If parent exists but is not deleted, show this folder at root trash level
        const parentFolder = await folderDao.getFolderById(
          folder.parent.toString()
        );
        if (parentFolder && parentFolder.deletedAt === null) {
          return folder;
        }

        // If parent is also deleted, don't show at root level
        return null;
      })
    );

    // Filter out nulls from the results
    const filteredFolders = rootTrashFolders.filter(
      (folder) => folder !== null
    ) as IFolder[];

    // Get all deleted files with null folder (top level) or
    // files whose parent folder is not deleted (orphaned)
    const deletedFiles = await fileService.getAllDeletedFiles(userId);

    // Filter to only include root deleted files or files whose parent folder isn't deleted
    const rootTrashFiles = await Promise.all(
      deletedFiles.map(async (file) => {
        // If no folder, it's a root file (show at trash root level)
        if (!file.folder) {
          return file;
        }

        // If parent folder exists but is not deleted, show this file at root trash level
        // This handles the case where individual files are deleted but their parent folders are not
        const parentFolder = await folderDao.getFolderById(
          file.folder.toString()
        );
        if (parentFolder && parentFolder.deletedAt === null) {
          return file;
        }

        // If parent is also deleted, don't show at root level (it will appear when navigating into the deleted folder)
        return null;
      })
    );

    // Filter out nulls from the results
    const filteredFiles = rootTrashFiles.filter(
      (file) => file !== null
    ) as any[];

    // Return the sanitized response
    return {
      folders: filteredFolders.map((folder) => this.sanitizeFolder(folder)),
      files: filteredFiles,
    };
  }

  // Helper to increment parent folder's item count when a new folder is created
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

  // Helper to decrement parent folder's item count when a folder is deleted or moved
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

  async getUserFolders(
    userId: string,
    parentId?: string | null,
    isDeleted: boolean = false
  ): Promise<FolderResponseDto[]> {
    const folders = await folderDao.getUserFolders(userId, parentId, isDeleted);
    return folders.map((folder) => this.sanitizeFolder(folder));
  }

  async getUserDeletedFolders(userId: string): Promise<FolderResponseDto[]> {
    const folders = await folderDao.getUserDeletedFolders(userId);
    return folders.map((folder) => this.sanitizeFolder(folder));
  }

  async permanentDeleteAllDeletedFolders(userId: string): Promise<void> {
    const result = await folderDao.permanentDeleteAllDeletedFolders(userId);
    if (!result.acknowledged) {
      throw new ApiError(500, [{ folder: "Failed to delete folders" }]);
    }
  }
}

export default new FolderService();
