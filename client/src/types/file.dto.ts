import { FolderResponseDto } from "./folder.dto";

export interface CreateFileDto {
  name: string;
  type: string;
  size: number;
  owner: string;
  folder?: string | null;
  storageKey: string;
  extension: string;
  hasPreview?: boolean;
}

export interface UpdateFileDto {
  name?: string;
  folder?: string | null;
  isPinned?: boolean;
}

export interface RenameFileDto {
  name: string;
}

export interface MoveFileDto {
  folder: string | null;
  name: string;
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
  hasPreview: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
