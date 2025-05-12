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
import fileDao from "@api/File/file.dao.js";
import logger from "@utils/logger.utils.js";
import mongoose from "mongoose";
import shareService from "@api/share/share.service.js";
import { IUserSharePermission } from "@api/share/share.dto.js";

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
  async verifyFolderOwnership(folderId: string, userId: string): Promise<IFolder> {
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
    userId: string,
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
    const files = await fileService.getUserFilesByFolders(userId, folderId)
    
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
   * Get a folder by ID and verify ownership
   *
   * @param folderId The ID of the folder to retrieve
   * @param ownerId The ID of the user who should own the folder
   * @param includeWorkspace Whether to include workspace data in the response
   * @returns The folder if found and owned by the user
   * @throws ApiError if folder not found or user doesn't own it
   */
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
        { authorization: "You do not have permission to access this folder" }
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
    await fileDao.bulkUpdateFilePaths(
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
      newParentFolder = await this.verifyFolderOwnership(moveData.parent, userId);

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
    await fileDao.bulkUpdateFilePaths(
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

  // Helper to update folder path when parent changes
  private async updateFolderPath(
    folder: FolderResponseDto,
    newParentId: string
  ): Promise<void> {
    const newParent = await folderDao.getFolderById(newParentId);
    if (!newParent) {
      throw new ApiError(404, [{ parent: "Parent folder not found" }]);
    }

    // Construct the new path
    const newPath = `${newParent.path}/${this.sanitizePathSegment(folder.name)}`;

    // Build new pathSegments
    // Convert existing parent path segments to string IDs
    const convertedParentSegments = (newParent.pathSegments || []).map(
      (segment) => ({
        name: segment.name,
        id:
          segment.id instanceof mongoose.Types.ObjectId
            ? segment.id.toString()
            : String(segment.id),
      })
    );

    const newPathSegments = [
      ...convertedParentSegments,
      {
        name: newParent.name,
        id:
          newParent._id instanceof mongoose.Types.ObjectId
            ? newParent._id.toString()
            : String(newParent._id),
      },
    ];

    // Update this folder's path - use a specific type for the update data
    const pathUpdateData: Record<string, any> = {
      path: newPath,
      pathSegments: newPathSegments,
    };

    // Use the folder's ID string
    await folderDao.updateFolder(folder.id, pathUpdateData);

    // TODO: Update all subfolders recursively
    // This would be needed for a complete implementation but
    // would require additional helper methods to traverse and update the tree
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
        isOwner 
      } as any 
    };

    // If owner, fetch all sharing information
    if (isOwner) {
      // Get public share if exists
      try {
        const publicShare = await shareService.getPublicShareByResource(folderId, userId);
        if (publicShare) {
          response.shareInfo.public = publicShare;
        }
      } catch (error) {
        // No public share exists - that's fine
      }
      
      // Get user shares if exist
      try {
        const userShare = await shareService.getUserShareByResource(folderId, userId);
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
        permission: permissionResult.permissionLevel || IUserSharePermission.VIEWER,
        allowDownload: permissionResult.allowDownload || false
      } as any;
    }
    
    return response;
  }
}

export default new FolderService();
