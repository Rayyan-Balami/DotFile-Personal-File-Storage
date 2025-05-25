import { FileResponseDto } from "@api/file/file.dto.js";

export interface CreateFolderDto {
  name: string;
  parent?: string | null;
}

export interface UpdateFolderDto {
  color?: string;
  isPinned?: boolean;
  items?: number;
}

export interface MoveFolderDto {
  parent: string | null;
  name: string;
}

export interface RenameFolderDto {
  name: string;
}

export interface PathSegment {
  id: string | null;
  name: string;
}

export interface FolderResponseDto {
  id: string;
  name: string;
  type: "folder";
  owner: string;
  color: string;
  parent: string | null;
  items: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FolderResponseWithFilesDto {
  folders: FolderResponseDto[];
  files: FileResponseDto[];
  pathSegments?: PathSegment[];
}
