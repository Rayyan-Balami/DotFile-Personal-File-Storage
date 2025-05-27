import { FolderResponseDto } from "./folder.dto";

export interface CreateFileDto {
  name: string;
  type: string;
  size: number;
  owner: string;
  folder?: string | null;
  storageKey: string;
  extension: string;
  duplicateAction?: "replace" | "keepBoth";
}

export interface UpdateFileDto {
  name?: string;
  folder?: string | null;
  isPinned?: boolean;
}

export interface RenameFileDto {
  name: string;
  duplicateAction?: "replace" | "keepBoth";
}

export interface MoveFileDto {
  destinationFolderId: string;
  duplicateAction?: "replace" | "keepBoth";
}

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
