import { UpdateFolderDto } from "@api/Folder/folder.dto.js";
import { Folder, IFolder } from "@api/Folder/folder.model.js";
import mongoose from "mongoose";

class FolderDao {
  async createFolder(folderData: Partial<IFolder>): Promise<IFolder> {
    const newFolder = new Folder(folderData);
    return newFolder.save();
  }

  async getUserFolders(
    userId: string,
    parentId?: string | null,
    isDeleted?: boolean
  ): Promise<IFolder[]> {
    return Folder.find({
      owner: userId,
      parent: parentId || null,
      deletedAt: isDeleted ? { $ne: null } : null,
    }).sort({ [isDeleted ? "deletedAt" : "createdAt"]: -1 });
  }

  async getFolderById(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findById(folderId);
  }

  async updateFolder(
    folderId: string,
    updateData: UpdateFolderDto
  ): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: updateData },
      { new: true }
    );
  }

  async trashFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
  }

  async restoreFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndUpdate(
      folderId,
      { $set: { deletedAt: null } },
      { new: true }
    );
  }

  async permanentlyDeleteFolder(folderId: string): Promise<IFolder | null> {
    if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
    return Folder.findByIdAndDelete(folderId);
  }

  async checkFolderExists(
    name: string,
    ownerId: string,
    parentId: string | null | undefined
  ): Promise<IFolder | null> {
    return Folder.findOne({
      name,
      owner: ownerId,
      parent: parentId || null,
      deletedAt: null,
    });
  }
}

export default new FolderDao();
