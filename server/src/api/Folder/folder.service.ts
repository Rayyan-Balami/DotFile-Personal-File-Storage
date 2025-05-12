import folderDao from "@api/Folder/folder.dao.js";
import { IFolder } from "@api/Folder/folder.model.js";
import { ApiError } from "@utils/apiError.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import {
  CreateFolderDto,
  FolderResponseDto,
  FolderResponseWithFilesDto,
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto,
} from "./folder.dto.js";
import fileService from "@api/File/file.service.js";
import { FileResponseDto } from "@api/File/file.dto.js";
import logger from "@utils/logger.utils.js";
import mongoose from "mongoose";
import shareService from "@api/share/share.service.js";
import { IUserSharePermission } from "@api/share/share.dto.js";
import fs from "fs/promises";
import path from "path";

class FolderService {
  // Create a new folder
  async createFolder(
    folderData: CreateFolderDto,
    ownerId: string
  ): Promise<FolderResponseDto> {
    // Calculate the path and prepare complete folder data
    const folderWithPath = await this.prepareFolderData(folderData, ownerId);
    const newFolder = await folderDao.createFolder(folderWithPath);

    // If folder has a parent, increment its item count
    if (folderData.parent) {
      await this.incrementParentItemCount(folderData.parent);
    }

    return this.sanitizeFolder(newFolder);
  }

  /**
   * Verifies that a folder belongs to the specified user
   *
   * @param folderId The ID of the folder to check
   * @param userId The ID of the user who should own the folder
   * @returns The folder if ownership is verified
   * @throws ApiError if folder not found or user is not the owner
   */
  async verifyFolderOwnership(
    folderId: string,
    userId: string
  ): Promise<IFolder> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      throw new ApiError(400, [{ folder: "Invalid folder ID" }]);
    }

    const folder = await folderDao.getFolderById(folderId);
    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    // Check if the folder belongs to the user
    if (folder.owner.toString() !== userId) {
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
   * @param includeWorkspace Whether to include workspace data in the response
   * @returns Folder contents including subfolders and files
   */
  async getFolderContents(
    folderId: string | null,
    userId: string
  ): Promise<FolderResponseWithFilesDto> {
    // if folderId is null then return all the folders and files having null parent (root level)
    if (!folderId) {
      // Get root folders with or without workspace data
      const rootFolders = await folderDao.getUserFolders(userId);

      const rootFiles = await fileService.getUserFilesByFolders(userId);
      return {
        folders: rootFolders.map((folder) => this.sanitizeFolder(folder)),
        files: rootFiles,
      };
    }

    // Verify folder ownership if folderId is provided
    if (folderId) {
      await this.verifyFolderOwnership(folderId, userId);
    }

    // Get folders by parent ID, with or without workspace data
    const folders = await folderDao.getUserFolders(userId, folderId);
    const files = await fileService.getUserFilesByFolders(userId, folderId);

    // Sanitize and return the folders
    return {
      folders: folders.map((folder) => this.sanitizeFolder(folder)),
      files: files,
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
   * Get folder by ID with support for shared resources
   * - Checks if user owns the folder
   * - If not, checks if folder is shared with user with sufficient permissions
   *
   * @param folderId Folder ID to retrieve
   * @param userId User ID requesting access
   * @param includeWorkspace Whether to include workspace details
   * @param requiredPermission Optional minimum permission level required
   * @returns Folder document or error if unauthorized
   */
  async getFolderById(
    folderId: string,
    userId: string,
    includeWorkspace: boolean = false,
    requiredPermission?: IUserSharePermission
  ): Promise<FolderResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      throw new ApiError(400, [{ folder: "Invalid folder ID" }]);
    }

    // Get folder with or without workspace data
    const folder = includeWorkspace
      ? await folderDao.getFolderWithWorkspace(folderId)
      : await folderDao.getFolderById(folderId);

    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    const folderOwnerId = folder.owner.toString();

    // Check if user has permission (either as owner or via shares)
    const permissionResult = await shareService.verifyPermission(
      folderId,
      userId,
      folderOwnerId,
      requiredPermission
    );

    if (!permissionResult.hasPermission) {
      throw new ApiError(403, [
        { authorization: "You do not have permission to access this folder" },
      ]);
    }

    return this.sanitizeFolder(folder);
  }

  /**
   * Increment a folder's item count when a new item is added to it
   * Public method for use by other services
   *
   * @param folderId ID of the folder to update
   */
  async incrementFolderItemCount(folderId: string): Promise<void> {
    await this.incrementParentItemCount(folderId);
  }

  /**
   * Decrement a folder's item count when an item is removed from it
   * Public method for use by other services
   *
   * @param folderId ID of the folder to update
   */
  async decrementFolderItemCount(folderId: string): Promise<void> {
    await this.decrementParentItemCount(folderId);
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
    // Verify folder ownership
    const folder = await this.verifyFolderOwnership(folderId, userId);

    // Sanitize and ensure unique name at this level
    const newName = await this.ensureUniqueNameAtLevel(
      renameData.name,
      userId,
      folder.parent ? folder.parent.toString() : null
    );

    // Get the old path for updates
    const oldPath = folder.path;
    const oldName = folder.name;

    // Create new path with new name (sanitized)
    const sanitizedNewName = this.sanitizePathSegment(newName);

    // Calculate the new path by replacing just the last segment
    const pathSegments = oldPath.split("/");
    const lastSegmentIndex = pathSegments.length - 1;
    pathSegments[lastSegmentIndex] = sanitizedNewName;
    const newPath = pathSegments.join("/");

    // Update this folder
    const updatedFolder = await folderDao.renameFolder(folderId, {
      name: sanitizedNewName,
      path: newPath,
    });

    if (!updatedFolder) {
      throw new ApiError(500, [{ folder: "Failed to update folder" }]);
    }

    // If path hasn't changed (e.g., same name with different case), no need for recursive updates
    if (oldPath === newPath) {
      return this.sanitizeFolder(updatedFolder);
    }

    logger.debug(
      `Updating paths for child items. Old path: ${oldPath}, New path: ${newPath}`
    );

    // Update all sub-folders recursively using the materialized path approach
    // This updates all folders whose path starts with the old path prefix
    await folderDao.bulkUpdateFolderPaths(
      oldPath, // Old prefix to match
      newPath, // New prefix replacement
      [] // No path segment updates needed for rename
    );

    // Update all files directly in this folder and in sub-folders
    await fileService.bulkUpdateFilePaths(
      oldPath, // Old prefix to match
      newPath, // New prefix replacement
      [] // No path segment updates needed for rename
    );

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
    // Verify folder ownership
    const folder = await this.verifyFolderOwnership(folderId, userId);

    // If the folder is already in the target parent, no need to move
    if (
      (moveData.parent === null && folder.parent === null) ||
      (moveData.parent !== null &&
        folder.parent !== null &&
        folder.parent.toString() === moveData.parent)
    ) {
      return this.sanitizeFolder(folder);
    }

    // Verify the target parent exists if not moving to root
    let newParentFolder = null;
    if (moveData.parent !== null) {
      // Verify the destination folder exists and the user owns it
      newParentFolder = await this.verifyFolderOwnership(
        moveData.parent,
        userId
      );

      // Check that we're not moving a folder into its own descendant
      if (
        await this.isFolderDescendant(
          newParentFolder._id instanceof mongoose.Types.ObjectId
            ? newParentFolder._id.toString()
            : String(newParentFolder._id),
          folderId
        )
      ) {
        throw new ApiError(400, [
          { parent: "Cannot move a folder into its own subfolder" },
        ]);
      }
    }

    // Store old parent for decrementing item count
    const oldParentId = folder.parent;

    // Store old path for path updates
    const oldPath = folder.path;

    // Calculate the new path
    let newPath = "";
    let newPathSegments: { name: string; id: string }[] = [];

    if (!moveData.parent) {
      // Moving to root level
      newPath = `/${this.sanitizePathSegment(folder.name)}`;
      newPathSegments = []; // Root level has no path segments
    } else {
      // Moving to a different parent folder
      newPath = `${newParentFolder!.path}/${this.sanitizePathSegment(folder.name)}`;

      // Convert pathSegments to the DTO format (with string IDs)
      const convertedPathSegments = (newParentFolder!.pathSegments || []).map(
        (segment) => ({
          name: segment.name,
          id:
            segment.id instanceof mongoose.Types.ObjectId
              ? segment.id.toString()
              : String(segment.id),
        })
      );

      newPathSegments = [
        ...convertedPathSegments,
        {
          name: newParentFolder!.name,
          id:
            newParentFolder!._id instanceof mongoose.Types.ObjectId
              ? newParentFolder!._id.toString()
              : String(newParentFolder!._id),
        },
      ];
    }

    // Update the folder's parent and path
    const updatedFolder = await folderDao.moveFolder(folderId, {
      parent: moveData.parent,
      path: newPath,
      pathSegments: newPathSegments,
    });

    if (!updatedFolder) {
      throw new ApiError(500, [{ folder: "Failed to update folder" }]);
    }

    // Update item counts for old and new parent folders
    // Decrement count on the old parent
    if (oldParentId) {
      await this.decrementParentItemCount(oldParentId.toString());
    }

    // Increment count on the new parent
    if (moveData.parent) {
      await this.incrementParentItemCount(moveData.parent);
    }

    logger.debug(`Moving folder. Old path: ${oldPath}, New path: ${newPath}`);

    // Update all sub-folders recursively using the materialized path approach
    await folderDao.bulkUpdateFolderPaths(
      oldPath, // Old prefix to match
      newPath, // New prefix replacement
      [] // No path segment updates needed for move
    );

    // Update all files in this folder and sub-folders
    await fileService.bulkUpdateFilePaths(
      oldPath, // Old prefix to match
      newPath, // New prefix replacement
      [] // No path segment updates needed for move
    );

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
    // Verify folder ownership
    await this.verifyFolderOwnership(folderId, userId);

    // Update the folder
    const updatedFolder = await folderDao.updateFolder(folderId, updateData);

    if (!updatedFolder) {
      throw new ApiError(500, [{ folder: "Failed to update folder" }]);
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

    // Check if our target folder is among the descendants
    return descendants.some((descendant) => {
      const descendantId =
        descendant._id instanceof mongoose.Types.ObjectId
          ? descendant._id.toString()
          : String(descendant._id);
      return descendantId === potentialDescendantId;
    });
  }

  private async prepareFolderData(
    folderData: CreateFolderDto,
    ownerId: string
  ): Promise<Partial<IFolder>> {
    // Basic folder properties
    const enhancedData: any = {
      ...folderData,
      owner: ownerId,
      type: "folder",
    };

    // Handle folder name - ensure uniqueness at the same level
    enhancedData.name = await this.ensureUniqueNameAtLevel(
      folderData.name,
      ownerId,
      folderData.parent
    );

    // Set path, pathSegments based on parent
    if (!folderData.parent) {
      // Root level folder
      enhancedData.path = `/${this.sanitizePathSegment(enhancedData.name)}`;
      enhancedData.pathSegments = [];
    } else {
      // Child folder - needs parent data
      const parentFolder = await folderDao.getFolderById(folderData.parent);
      if (!parentFolder) {
        throw new ApiError(404, [{ parent: "Parent folder not found" }]);
      }

      // Construct the path based on parent
      enhancedData.path = `${parentFolder.path}/${this.sanitizePathSegment(enhancedData.name)}`;

      // Copy parent's pathSegments and add parent to it
      // Convert parent path segments to string IDs
      const convertedParentSegments = (parentFolder.pathSegments || []).map(
        (segment) => ({
          name: segment.name,
          id:
            segment.id instanceof mongoose.Types.ObjectId
              ? segment.id.toString()
              : String(segment.id),
        })
      );

      enhancedData.pathSegments = [
        ...convertedParentSegments,
        {
          name: parentFolder.name,
          id:
            parentFolder._id instanceof mongoose.Types.ObjectId
              ? parentFolder._id.toString()
              : String(parentFolder._id),
        },
      ];
    }

    return enhancedData;
  }

  // Helper to sanitize path segments - replaces spaces with hyphens and removes invalid chars
  private sanitizePathSegment(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[\/\\:*?"<>|]/g, "") // Remove invalid filesystem characters
      .toLowerCase(); // Lowercase for consistency
  }

  // Helper to ensure unique name at the same folder level
  private async ensureUniqueNameAtLevel(
    name: string,
    ownerId: string,
    parentId: string | null | undefined
  ): Promise<string> {
    let finalName = name;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      // Check if a folder with this name already exists at the same level
      const existingFolder = await folderDao.checkFolderExists(
        finalName,
        ownerId,
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
    const parentFolder = await folderDao.getFolderById(parentId);
    if (!parentFolder) {
      throw new ApiError(404, [{ parent: "Parent folder not found" }]);
    }

    // Ensure count doesn't go below 0
    await folderDao.updateFolder(parentId, {
      items: Math.max(0, (parentFolder.items || 1) - 1),
    });
  }

  private sanitizeFolder(folder: IFolder): FolderResponseDto {
    return sanitizeDocument<FolderResponseDto>(folder, {
      excludeFields: ["__v"],
      recursive: true,
    });
  }

  /**
   * Get folder with sharing information
   *
   * @param folderId ID of the folder to retrieve
   * @param userId ID of the user making the request
   * @returns Folder with populated sharing information
   */
  async getFolderWithShareInfo(
    folderId: string,
    userId: string
  ): Promise<FolderResponseDto & { shareInfo?: any }> {
    // First verify the user has access to this folder
    const folder = await this.getFolderById(folderId, userId);

    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    // Check if this is the owner
    const isOwner = folder.owner.toString() === userId;

    // Create response object with type assertion for shareInfo
    const response = {
      ...folder,
      shareInfo: {
        isOwner,
      } as any,
    };

    // If owner, fetch all sharing information
    if (isOwner) {
      // Get public share if exists
      try {
        const publicShare = await shareService.getPublicShareByResource(
          folderId,
          userId
        );
        if (publicShare) {
          response.shareInfo.public = publicShare;
        }
      } catch (error) {
        // No public share exists - that's fine
      }

      // Get user shares if exist
      try {
        const userShare = await shareService.getUserShareByResource(
          folderId,
          userId
        );
        if (userShare) {
          response.shareInfo.users = userShare;
        }
      } catch (error) {
        // No user shares exist - that's fine
      }
    } else {
      // For non-owners, get their specific permissions
      const permissionResult = await shareService.verifyPermission(
        folderId,
        userId,
        folder.owner.toString()
      );

      response.shareInfo = {
        ...response.shareInfo,
        permission:
          permissionResult.permissionLevel || IUserSharePermission.VIEWER,
        allowDownload: permissionResult.allowDownload || false,
      } as any;
    }

    return response;
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
    // Verify folder ownership
    const folder = await this.verifyFolderOwnership(folderId, userId);

    // If folder has a parent, decrement its item count
    if (folder.parent) {
      await this.decrementParentItemCount(folder.parent.toString());
    }

    // Soft delete the folder
    const deletedFolder = await folderDao.softDeleteFolder(folderId);

    if (!deletedFolder) {
      throw new ApiError(500, [{ folder: "Failed to delete folder" }]);
    }

    // Note: We don't need to soft delete child items as they
    // won't be shown in user home when the parent is deleted

    return this.sanitizeFolder(deletedFolder);
  }

  /**
   * Permanently delete a folder and its contents
   *
   * @param folderId ID of the folder to permanently delete
   * @param userId ID of the user who owns the folder
   * @returns Result of the delete operation
   */
  async permanentDeleteFolder(
    folderId: string,
    userId: string
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    // Verify folder exists and belongs to user (include deleted folders)
    const folder = await folderDao.getFolderById(folderId);

    if (!folder) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }

    if (folder.owner.toString() !== userId) {
      throw new ApiError(403, [
        { authentication: "You do not have permission to delete this folder" },
      ]);
    }

    // Get all files directly in this folder first
    const directFiles = await fileService.getUserFilesByFolders(
      userId,
      folderId,
      true
    );

    // Get all descendant folders for recursive deletion
    const descendantFolders = await folderDao.getAllDescendantFolders(folderId);
    const descendantFolderIds = descendantFolders.map((subfolder) =>
      subfolder._id.toString()
    );

    // Collect all files in descendant folders
    let allFiles = [...directFiles];
    for (const subfolderId of descendantFolderIds) {
      const subfolderFiles = await fileService.getUserFilesByFolders(
        userId,
        subfolderId,
        true
      );
      allFiles = [...allFiles, ...subfolderFiles];
    }

    // Delete all physical files
    for (const file of allFiles) {
      try {
        const userStorageDir = `uploads/user-${userId}`;
        const filePath = path.join(
          process.cwd(),
          userStorageDir,
          file.storageKey
        );

        await fs.access(filePath);
        await fs.unlink(filePath);
        logger.debug(`Physical file deleted: ${filePath}`);
      } catch (error) {
        logger.error(`Failed to delete physical file: ${error}`);
      }

      // Delete the file record
      await fileService.permanentDeleteFile(file.id, userId);
    }

    // Delete all subfolders
    for (const subfolder of descendantFolders) {
      await folderDao.permanentDeleteFolder(subfolder._id.toString());
    }

    // Finally, delete the folder itself
    const deleteResult = await folderDao.permanentDeleteFolder(folderId);

    return {
      acknowledged: !!deleteResult,
      deletedCount: deleteResult ? 1 : 0,
    };
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
    const folder = await folderDao.getFolderById(folderId);

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
          userId
        );

        // If parent exists and is not deleted, increment its item count
        if (parentFolder) {
          await this.incrementParentItemCount(folder.parent.toString());
        }
      } catch (error) {
        // If parent is deleted or doesn't exist, move folder to root
        folder.parent = null;
        folder.path = `/${folder.name}`;
        folder.pathSegments = [];
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
  async emptyTrash(
    userId: string,
  ): Promise<{
    acknowledged: boolean;
    filesDeleted: number;
    foldersDeleted: number;
  }> {
    // Get all deleted folders for this user
    const deletedFolders = await folderDao.permanentDeleteAllDeletedFolders(userId);
    // Get all deleted files for this user
    const deletedFiles = await fileService.permanentDeleteAllDeletedFiles(userId);

    return {
      acknowledged: true,
      filesDeleted: deletedFiles.deletedCount,
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
  async getTrashContents(
    userId: string,
  ): Promise<FolderResponseWithFilesDto> {
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
          const parentFolder = await folderDao.getFolderById(folder.parent.toString());
          if (parentFolder && parentFolder.deletedAt === null) {
            return folder;
          }
          
          // If parent is also deleted, don't show at root level
          return null;
        })
      );
      
      // Filter out nulls from the results
      const filteredFolders = rootTrashFolders.filter(folder => folder !== null) as IFolder[];
      
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
          const parentFolder = await folderDao.getFolderById(file.folder.toString());
          if (parentFolder && parentFolder.deletedAt === null) {
            return file;
          }
          
          // If parent is also deleted, don't show at root level (it will appear when navigating into the deleted folder)
          return null;
        })
      );
      
      // Filter out nulls from the results
      const filteredFiles = rootTrashFiles.filter(file => file !== null) as any[];
      
      // Return the sanitized response
      return {
        folders: filteredFolders.map(folder => this.sanitizeFolder(folder)),
        files: filteredFiles
      };
  }
}

export default new FolderService();
