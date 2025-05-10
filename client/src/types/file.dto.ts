export interface FileDto {
  id: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  type: string;
  owner: string;
  folder: string | null;
  workspace?: string | null;
  isPinned?: boolean;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileResponseDto extends FileDto {
  // Any additional fields returned by API
  downloadUrl?: string;
}

export interface UpdateFileDto {
  name?: string;
  folder?: string | null;
  isPinned?: boolean;
  isShared?: boolean;
  workspace?: string | null;
}

export interface RenameFileDto {
  newName: string;
}

export interface MoveFileDto {
  newParentId: string | null;
}
