import { sanitizeDocument } from "@utils/sanitizeDocument.js";
import folderDao from "@api/Folder/folder.dao.js";
import {
  CreateFolderDto,
  FolderResponseDto,
  GetFoldersQueryDto,
  UpdateFolderDto,
} from "./folder.dto.js";
import { IFolder } from "@api/Folder/folder.model.js";
import { ApiError } from "@utils/apiError.js";
import { createFolderDirectory } from "@utils/mkdir.utils.js";

class FolderService {
  // Create a new folder
  async createFolder(
    folderData: CreateFolderDto,
    ownerId: string
  ): Promise<FolderResponseDto> {
    // Calculate the path and prepare complete folder data
    const folderWithPath = await this.prepareFolderData(folderData, ownerId);
    const newFolder = await folderDao.createFolder(folderWithPath);
    const sanitizedFolder = this.sanitizeFolder(newFolder);

    // Create physical folder directory and store its path
    const physicalPath = createFolderDirectory(ownerId, newFolder.id.toString());
    
    // Update the folder with its physical storage location
    await folderDao.updateFolder(newFolder.id.toString(), {
      storageLocation: physicalPath
    });

    // If folder has a parent, increment its item count
    if (folderData.parent) {
      await this.incrementParentItemCount(folderData.parent);
    }

    return sanitizedFolder;
  }

  // Get a folder by ID
  async getFolderById(
    folderId: string,
    ownerId: string
  ): Promise<FolderResponseDto> {
    const folder = await folderDao.getFolderById(folderId);

    if (!folder) {
      throw new ApiError(404, "Folder not found", ["folder"]);
    }

    // Check if user is the owner
    if (folder.owner.toString() !== ownerId) {
      throw new ApiError(403, "You don't have access to this folder", [
        "authorization",
      ]);
    }

    return this.sanitizeFolder(folder);
  }

  // Get all folders matching query
  async getFolders(
    ownerId: string,
    query: GetFoldersQueryDto
  ): Promise<FolderResponseDto[]> {
    const folders = await folderDao.getFolders(ownerId, query);
    return folders.map((folder) => this.sanitizeFolder(folder));
  }

  // Update a folder
  async updateFolder(
    folderId: string,
    updateData: UpdateFolderDto,
    ownerId: string
  ): Promise<FolderResponseDto> {
    // Check if folder exists and belongs to user
    const existingFolder = await folderDao.getFolderById(folderId);

    if (!existingFolder) {
      throw new ApiError(404, "Folder not found", ["folder"]);
    }

    if (existingFolder.owner.toString() !== ownerId) {
      throw new ApiError(403, "You don't have access to this folder", [
        "authorization",
      ]);
    }

    // If moving folder to a new parent
    if (
      updateData.parent !== undefined &&
      updateData.parent !== existingFolder.parent?.toString()
    ) {
      // Check if new parent exists
      if (updateData.parent) {
        const parentFolder = await folderDao.getFolderById(updateData.parent);
        if (!parentFolder) {
          throw new ApiError(404, "Parent folder not found", ["parent"]);
        }

        // Check if new parent is owned by the same user
        if (parentFolder.owner.toString() !== ownerId) {
          throw new ApiError(
            403,
            "You don't have access to the destination folder",
            ["authorization"]
          );
        }

        // Check if new parent is not a child of this folder (prevent circular references)
        if (await this.isDescendant(folderId, updateData.parent)) {
          throw new ApiError(
            400,
            "Cannot move a folder into its own subfolder",
            ["parent"]
          );
        }

        // Increment new parent's items count
        await this.incrementParentItemCount(updateData.parent);

        // Decrement old parent's items count if it exists
        if (existingFolder.parent) {
          await this.decrementParentItemCount(existingFolder.parent.toString());
        }

        // Recalculate path and pathSegments for this folder and all children
        const enhancedData = { ...updateData };
        await this.updateFolderPath(
          this.sanitizeFolder(existingFolder),
          updateData.parent
        );

        // Update with new path and other data
        const updatedFolder = await folderDao.updateFolder(
          folderId,
          enhancedData
        );
        if (!updatedFolder) {
          throw new ApiError(500, "Failed to update folder", ["update"]);
        }

        return this.sanitizeFolder(updatedFolder);
      } else {
        // Moving to root level
        // Decrement old parent's items count if it exists
        if (existingFolder.parent) {
          await this.decrementParentItemCount(existingFolder.parent.toString());
        }

        // Recalculate path for root-level folder
        const enhancedData = {
          ...updateData,
          path: `/${this.sanitizePathSegment(existingFolder.name)}`,
          pathSegments: [],
        };

        const updatedFolder = await folderDao.updateFolder(
          folderId,
          enhancedData
        );
        if (!updatedFolder) {
          throw new ApiError(500, "Failed to update folder", ["update"]);
        }

        return this.sanitizeFolder(updatedFolder);
      }
    } else if (updateData.name && updateData.name !== existingFolder.name) {
      // If just changing the name, check for duplicates and update path
      const newName = await this.ensureUniqueNameAtLevel(
        updateData.name,
        ownerId,
        existingFolder.parent?.toString() || null
      );

      // Update path with new name
      const parentPath = existingFolder.path.substring(
        0,
        existingFolder.path.lastIndexOf("/")
      );
      const newPath = `${parentPath}/${this.sanitizePathSegment(newName)}`;

      const enhancedData = {
        ...updateData,
        name: newName,
        path: newPath,
      };

      const updatedFolder = await folderDao.updateFolder(
        folderId,
        enhancedData
      );
      if (!updatedFolder) {
        throw new ApiError(500, "Failed to update folder", ["update"]);
      }

      return this.sanitizeFolder(updatedFolder);
    } else {
      // Simple update without path changes
      const updatedFolder = await folderDao.updateFolder(folderId, updateData);
      if (!updatedFolder) {
        throw new ApiError(500, "Failed to update folder", ["update"]);
      }

      return this.sanitizeFolder(updatedFolder);
    }
  }

  // Delete a folder (soft delete)
  async deleteFolder(
    folderId: string,
    ownerId: string
  ): Promise<FolderResponseDto> {
    // Check if folder exists and belongs to user
    const existingFolder = await folderDao.getFolderById(folderId);

    if (!existingFolder) {
      throw new ApiError(404, "Folder not found", ["folder"]);
    }

    if (existingFolder.owner.toString() !== ownerId) {
      throw new ApiError(403, "You don't have access to this folder", [
        "authorization",
      ]);
    }

    // Decrement parent folder's item count if parent exists
    if (existingFolder.parent) {
      await this.decrementParentItemCount(existingFolder.parent.toString());
    }

    // Perform soft delete
    const deletedFolder = await folderDao.deleteFolder(folderId);
    if (!deletedFolder) {
      throw new ApiError(500, "Failed to delete folder", ["delete"]);
    }

    return this.sanitizeFolder(deletedFolder);
  }

  // Get contents of a specific folder (immediate children only)
  async getFolderContents(
    folderId: string | null,
    ownerId: string
  ): Promise<FolderResponseDto[]> {
    // If folderId is provided, verify folder exists and user has access
    if (folderId) {
      const folder = await folderDao.getFolderById(folderId);
      
      if (!folder) {
        throw new ApiError(404, "Folder not found", ["folder"]);
      }
      
      if (folder.owner.toString() !== ownerId) {
        throw new ApiError(403, "You don't have access to this folder", ["authorization"]);
      }
    }
    
    // Get all immediate children of this folder
    const folders = await folderDao.getFolderContents(folderId, ownerId);
    return folders.map((folder) => this.sanitizeFolder(folder));
  }

  // Helper method to check if a folder is a descendant of another
  private async isDescendant(
    ancestorId: string,
    descendantId: string
  ): Promise<boolean> {
    const descendant = await folderDao.getFolderById(descendantId);
    if (!descendant || !descendant.parent) return false;

    if (descendant.parent.toString() === ancestorId) {
      return true;
    }

    return this.isDescendant(ancestorId, descendant.parent.toString());
  }

  // Helper to update folder path when parent changes
  private async updateFolderPath(
    folder: FolderResponseDto,
    newParentId: string
  ): Promise<void> {
    const newParent = await folderDao.getFolderById(newParentId);
    if (!newParent) {
      throw new ApiError(404, "Parent folder not found", ["parent"]);
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
        throw new ApiError(404, "Parent folder not found", ["parent"]);
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
      throw new ApiError(404, "Parent folder not found", ["parent"]);
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
      throw new ApiError(404, "Parent folder not found", ["parent"]);
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
