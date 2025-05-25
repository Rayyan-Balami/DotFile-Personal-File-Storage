import { FolderResponseDto, PathSegment } from "./folder.dto";

// Unified BaseItem interface
interface BaseItem {
  id: string;
  name: string;
  type: "folder" | "document";
  owner: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Folder item based on FolderResponseDto
export interface FolderItem extends BaseItem {
  type: "folder";
  color: string;
  parent: string | null;
  items: number;
  path: string;
  pathSegments: PathSegment[];
}

// Document (file) item based on FileResponseDto
export interface DocumentItem extends BaseItem {
  type: "document";  // Explicitly set type for DocumentItem
  size: number;
  folder: FolderResponseDto | null;
  storageKey: string;
  extension: string;
  hasPreview: boolean;
  path: string;
  pathSegments: PathSegment[];
}

// Combined type
export type FileSystemItem = FolderItem | DocumentItem;

// API response format for folder contents
export interface FolderContentsResponse {
  folders: FolderItem[];
  files: DocumentItem[];
}
