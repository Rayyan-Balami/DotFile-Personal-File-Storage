
export interface CreateFileDto {
  name: string;
  type: string;
  size: number;
  owner: string;
  folder?: string | null;
  path?: string;
  pathSegments?: { name: string; id: string }[];
  storageKey: string;
  extension?: string;
}

export interface UpdateFileDto {
  folder?: string | null;
  isPinned?: boolean;
}

export interface RenameFileDto {
  name: string;
  path?: string;
}

export interface MoveFileDto {
  folder: string | null;
  path?: string;
  pathSegments?: { name: string; id: string }[];
  name: string;
}

export interface FileResponseDto {
  id: string;
  name: string;
  type: string;
  size: number;
  owner: string;
  folder: string | null;
  path: string;
  pathSegments: { name: string; id: string }[];
  extension: string;
  isPinned: boolean;
  workspace: string | null;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
