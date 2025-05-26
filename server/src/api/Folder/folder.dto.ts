
/**
 * New folder creation payload
 */
export interface CreateFolderDto {
  name: string;
  parent?: string | null;
  color?: string;
  items?: number;
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
}

/**
 * Folder rename data
 */
export interface RenameFolderDto {
  name: string;
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
}

/**
 * Folder contents with navigation path
 */
export interface FolderResponseWithFilesDto {
  folders: FolderResponseDto[];
  files: any[];
  pathSegments?: PathSegment[];
}
