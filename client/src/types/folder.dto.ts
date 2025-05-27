import { FileResponseDto } from "./file.dto";

export interface CreateFolderDto {
  name: string;
  parent?: string | null;
  duplicateAction?: "replace" | "keepBoth";
}

export interface UpdateFolderDto {
  color?: string;
  isPinned?: boolean;
  items?: number;
}

export interface MoveFolderDto {
  parent: string;
  name: string;
  duplicateAction?: "replace" | "keepBoth";
}

export interface RenameFolderDto {
  name: string;
  duplicateAction?: "replace" | "keepBoth";
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

export interface FolderResponseWithFilesDto extends FolderResponseDto {
  files: FileResponseDto[];
  folders: FolderResponseDto[];
  pathSegments: Array<{
    id: string;
    name: string;
  }>;
}
