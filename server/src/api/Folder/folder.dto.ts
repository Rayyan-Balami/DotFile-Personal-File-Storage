import { FileResponseDto } from "@api/file/file.dto.js";

/**
 * New folder creation payload
 */
export interface CreateFolderDto {
  name: string;
  parent?: string | null;
  color?: string;
  items?: number;
  duplicateAction?: "replace" | "keepBoth";
}

/**
 * Optional folder properties update
 */
export interface UpdateFolderDto {
  color?: string;
  isPinned?: boolean;
  items?: number;
}

/**
 * Folder relocation data
 */
export interface MoveFolderDto {
  parent: string | null;
  name: string;
  duplicateAction?: "replace" | "keepBoth";
}

/**
 * Folder rename data
 */
export interface RenameFolderDto {
  name: string;
  duplicateAction?: "replace" | "keepBoth";
}

/**
 * Breadcrumb path element
 */
export interface PathSegment {
  id: string | null;
  name: string;
}

/**
 * Sanitized folder data for client
 */
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
  hasDeletedAncestor?: boolean; // Add this line
}

/**
 * Folder contents with navigation path
 */
export interface FolderResponseWithFilesDto {
  folders: FolderResponseDto[];
  files: FileResponseDto[];
  pathSegments?: PathSegment[];
}

/**
 * Paginated pin contents response
 */
export interface PaginatedPinContentsDto {
  folders: FolderResponseDto[];
  files: FileResponseDto[];
  pathSegments?: PathSegment[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Search parameters for content search
 */
export interface SearchContentsDto {
  query: string;
  itemType: string; // all, folder, file
  fileTypes: string[];
  colors: string[];
  isPinned?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
