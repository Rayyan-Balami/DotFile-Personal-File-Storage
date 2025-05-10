import { FileResponseDto } from "./file.dto";

export interface FolderDto {
  id: string;
  name: string;
  path: string;
  owner: string;
  parent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderResponseDto extends FolderDto {
  // Any additional fields returned by API
}

export interface FolderResponseWithFilesDto extends FolderResponseDto {
  files: FileResponseDto[];
  subfolders: FolderResponseDto[];
}

export interface CreateFolderDto {
  name: string;
  parent?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  parent?: string | null;
}

export interface RenameFolderDto {
  newName: string;
}

export interface MoveFolderDto {
  newParentId: string | null;
}
