import { FolderResponseDto, PathSegment } from "./folder.dto";
import { ColorOption } from '@/config/colors';

// Unified BaseItem interface
interface BaseItem {
  id: string;
  name: string;
  // We use type for server-side MIME type or "folder"
  type: string; 
  // We use cardType for UI rendering decisions
  cardType: 'folder' | 'document';
  owner: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Folder item based on FolderResponseDto
export interface FolderItem extends BaseItem {
  type: 'folder'; // Always "folder" for folders
  cardType: 'folder';
  color: ColorOption;
  parent: string | null;
  items: number;
  path: string;
  pathSegments: PathSegment[];
}

// Document (file) item based on FileResponseDto
export interface DocumentItem extends BaseItem {
  type: string; // MIME type for files (e.g. "image/png")
  cardType: 'document';
  size: number;
  folder: FolderResponseDto | null;
  storageKey: string;
  extension: string;
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
