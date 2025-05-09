import mongoose from 'mongoose';

export interface CreateFileDto {
  name: string;
  type: string;
  size: number;
  owner: string;
  folder?: string | null;
  path?: string;
  pathSegments?: { name: string; id: mongoose.Types.ObjectId | string }[];
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
  path?: string;
  pathSegments?: { name: string; id: mongoose.Types.ObjectId | string }[];
}

export interface RenameFileDto {
  newName: string;
}

export interface MoveFileDto {
  newParentId: string | null;
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
