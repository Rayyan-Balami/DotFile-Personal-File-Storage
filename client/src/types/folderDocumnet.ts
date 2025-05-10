import { Workspace } from "./desk";

// Define types for your file system items
export interface BaseItem {
  id: string;
  type: 'folder' | 'document';
  title: string;
  ownerId: string;
  parentFolderId: string | null; 
  dateModified: string;
  dateAdded: string;
  trashedAt: string | null;
  isPinned: boolean;
  sharedUsersPreview: SharedUsersPreview[];
}

export interface FolderItem extends BaseItem {
  type: 'folder';
  desk: Workspace;
  childCount: number;
  children: string[];
}

export interface DocumentItem extends BaseItem {
  type: 'document';
  fileExtension: string;
  byteCount: number;
  previewUrl?: string | null;
}

export interface SharedUsersPreview {
  id: string;
  name: string;
  image: string;
}

export type FileSystemItem = FolderItem | DocumentItem;