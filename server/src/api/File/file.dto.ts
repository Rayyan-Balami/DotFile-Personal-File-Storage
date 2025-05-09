export interface CreateFileDto {
  name: string;
  type: string;
  size: number;
  owner: string;
  folder?: string | null;
  path?: string;
  pathSegments?: { name: string; id: string }[];
  storageKey: string;
  workspace?: string | null;
  originalPath?: string;
  extension?: string;
}

export interface UpdateFileDto {
  name?: string;
  folder?: string | null;
  isPinned?: boolean;
  isShared?: boolean;
  workspace?: string | null;
}

export interface GetFileDto {
  id: string;
}

export interface GetFilesQueryDto {
  folder?: string | null;
  workspace?: string | null;
  isPinned?: boolean;
  isShared?: boolean;
  includeDeleted?: boolean;
  search?: string;
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
  isShared: boolean;
  workspace: string | null;
  storageKey: string;
  originalPath?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}