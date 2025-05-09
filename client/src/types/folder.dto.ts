import { FileResponseDto } from "./file.dto";

export interface CreateFolderDto {
  name: string;
  parent?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  parent?: string | null;
  workspace?: string | null;
  isPinned?: boolean;
  isShared?: boolean;
  path?: string;
  pathSegments?: { name: string; id: string }[];
  items?: number;
}

export interface FolderResponseDto {
  id: string;
  name: string;
  type: 'folder';
  owner: string;
  workspace: string | null;
  parent: string | null;
  items: number;
  isPinned: boolean;
  isShared: boolean;

  /**
   * Logical path representing folder hierarchy (e.g., "/Documents/Projects")
   * Used for display and navigation purposes
   */
  path: string;

  /**
   * Structured array of ancestor folders for breadcrumb navigation
   */
  pathSegments: { name: string; id: string }[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}


export interface FolderResponseWithFilesDto {
  files: FileResponseDto[];
  folders: FolderResponseDto[];
}
