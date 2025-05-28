import { FolderResponseDto } from "@api/folder/folder.dto.js";

/**
 * Data transfer object for creating a new file
 */
export interface CreateFileDto {
  name: string;
  type: string;
  size: number;
  owner: string;
  folder?: string | null;
  storageKey: string;
  extension: string;
}

/**
 * Data transfer object for updating file properties
 */
export interface UpdateFileDto {
  folder?: string | null;
  isPinned?: boolean;
}

/**
 * Data transfer object for renaming a file
 */
export interface RenameFileDto {
  name: string;
  duplicateAction?: "replace" | "keepBoth";
}

/**
 * Data transfer object for moving a file to different folder
 */
export interface MoveFileDto {
  folder: string | null;
  name: string;
}

/**
 * Data transfer object for file response with complete file information
 */
export interface FileResponseDto {
  id: string;
  name: string;
  type: string;
  size: number;
  owner: string;
  folder: FolderResponseDto | null;
  storageKey: string;
  extension: string;
  isPinned: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
