import { CreateFolderDto, GetFoldersQueryDto, UpdateFolderDto } from "@api/Folder/folder.dto.js";
import { Folder, IFolder } from "@api/Folder/folder.model.js";
import mongoose from "mongoose";

class FolderDao {
  async createFolder(folderData: any): Promise<IFolder> {
    const newFolder = new Folder(folderData);
    return await newFolder.save();
  }

  async getFolderById(folderId: string, includeDeleted: boolean = false): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    
    return await Folder.findOne({
      _id: folderId,
      ...(includeDeleted ? {} : { deletedAt: null })
    });
  }

  /**
   * Get direct children of a specific folder
   * For file manager style navigation - only retrieves immediate children
   */
  async getFolderContents(folderId: string | null, ownerId: string, includeDeleted: boolean = false): Promise<IFolder[]> {
    return await Folder.find({
      owner: ownerId,
      parent: folderId,
      ...(includeDeleted ? {} : { deletedAt: null })
    }).sort({ name: 1 });
  }

  async updateFolder(folderId: string, updateData: UpdateFolderDto): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    
    return await Folder.findByIdAndUpdate(
      folderId,
      { $set: updateData },
      { new: true }
    );
  }

  // Check if a folder with the same name exists at the same level (same parent)
  async checkFolderExists(name: string, ownerId: string, parentId: string | null | undefined): Promise<IFolder | null> {
    return await Folder.findOne({
      name,
      owner: ownerId,
      parent: parentId || null,
      deletedAt: null // Only check non-deleted folders
    });
  }

  // Get all folders matching query parameters
  async getFolders(ownerId: string, query: GetFoldersQueryDto): Promise<IFolder[]> {
    const { parent, workspace, isPinned, isShared, includeDeleted } = query;
    
    const filter: any = {
      owner: ownerId,
      ...(includeDeleted ? {} : { deletedAt: null })
    };
    
    // Add optional filters if provided
    if (parent !== undefined) filter.parent = parent || null;
    if (workspace !== undefined) filter.workspace = workspace;
    if (isPinned !== undefined) filter.isPinned = isPinned;
    if (isShared !== undefined) filter.isShared = isShared;
    
    return await Folder.find(filter).sort({ name: 1 });
  }

  // Get user's top-level folders (root folders)
  async getUserTopLevelFolders(userId: string): Promise<IFolder[]> {
    return await Folder.find({
      owner: userId,
      parent: null,
      deletedAt: null
    }).sort({ name: 1 });
  }

  // Get folder breadcrumb path by retrieving all parent folders
  async getFolderBreadcrumb(folderId: string): Promise<IFolder[]> {
    const result: IFolder[] = [];
    let currentFolder = await this.getFolderById(folderId);
    
    while (currentFolder && currentFolder.parent) {
      const parentFolder = await this.getFolderById(currentFolder.parent.toString());
      if (parentFolder) {
        result.unshift(parentFolder); // Add to beginning of array
        currentFolder = parentFolder;
      } else {
        break;
      }
    }
    
    return result;
  }

  async deleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    
    // Soft delete by setting deletedAt
    return Folder.findByIdAndUpdate(
      folderId,
      { deletedAt: new Date() },
      { new: true }
    );
  }

  async permanentlyDeleteFolder(folderId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return false;
    
    const result = await Folder.deleteOne({ _id: folderId });
    return result.deletedCount === 1;
  }

  async restoreFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    
    // Restore by removing deletedAt
    return Folder.findByIdAndUpdate(
      folderId,
      { $unset: { deletedAt: "" } },
      { new: true }
    );
  }
}

export default new FolderDao();