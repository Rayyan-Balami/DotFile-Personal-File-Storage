import folderDao from "@api/Folder/folder.dao.js";
import { IFolder } from "@api/Folder/folder.model.js";
import { ApiError } from "@utils/apiError.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.js";
import {
  CreateFolderDto,
  FolderResponseDto,
  FolderResponseWithFilesDto,
} from "./folder.dto.js";
import fileService from "@api/File/file.service.js";
import { FileResponseDto } from "@api/File/file.dto.js";

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

  //this gives the immediate children of a folder like other folders and files
  async getFolderContents(
    folderId: string | null,
    userId: string
  ): Promise<FolderResponseWithFilesDto> {
    // if folderId is null then return all the folders and files having null parent (root level)
    if (!folderId) {
      const rootFolders = await folderDao.getUserFolders(userId);
      const rootFiles = await fileService.getUserFilesByFolders(userId);
      return {
        folders: rootFolders.map((folder) => this.sanitizeFolder(folder)),
        files: rootFiles,
      };
    }
    // Get folder by ID
    const folders = await folderDao.getUserFolders(userId, folderId);
    const files = await fileService.getUserFilesByFolders(userId, folderId);
    if (!folders || folders.length === 0) {
      throw new ApiError(404, [{ folder: "Folder not found" }]);
    }
    // Sanitize and return the folders
    return {
      folders: folders.map((folder) => this.sanitizeFolder(folder)),
      files: files,
    };
  }

  async getFolderByNameAndParent(
    name: string,
    parentId: string | null,
    ownerId?: string
  ): Promise<FolderResponseDto | null> {
    // If ownerId is not provided, we can't check for the folder
    if (!ownerId) {
      return null;
    }

    const folder = await folderDao.checkFolderExists(name, ownerId, parentId);
    return folder ? this.sanitizeFolder(folder) : null;
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
    const newPathSegments = [
      ...(newParent.pathSegments || []),
      {
        name: newParent.name,
        id: newParent._id,
      },
    ];

    // Update this folder's path - use a specific type for the update data
    const pathUpdateData: Record<string, any> = {
      path: newPath,
      pathSegments: newPathSegments,
    };

    // Use toString() to convert ObjectId to string
    await folderDao.updateFolder(folder.id.toString(), pathUpdateData);

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
      enhancedData.pathSegments = [
        ...(parentFolder.pathSegments || []),
        {
          name: parentFolder.name,
          id: parentFolder._id,
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
}

export default new FolderService();
