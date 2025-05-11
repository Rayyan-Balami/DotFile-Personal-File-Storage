import { WorkspaceResponseDto } from "./workspace.dto";

// Define types for your file system items
export interface BaseItem {
  id: string;
  name: string;
  type: string;
  owner: string;
  workspace: WorkspaceResponseDto | null;
  path: string;
  pathSegments: { name: string; id: string }[];
  isPinned: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FolderItem extends BaseItem {
  type: 'folder';
  parent: string | null;
  items: number;
}

export interface DocumentItem extends BaseItem {
  size: number;
  folder: string | null;
  storageKey: string;
  extension: string;
}

export interface SharedUsersPreview {
  id: string;
  name: string;
  image: string;
}

export type FileSystemItem = FolderItem | DocumentItem;

// Structure matching the API response
export interface FolderContentsResponse {
  folders: FolderItem[];
  files: DocumentItem[];
}