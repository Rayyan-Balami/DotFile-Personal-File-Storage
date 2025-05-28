import { FolderResponseDto } from "./folder.dto";
import { FileResponseDto } from "./file.dto";
import { ColorOption } from '@/config/colors';

// Folder item based on FolderResponseDto with UI properties
export interface FolderItem extends FolderResponseDto {
  cardType: 'folder';
  color: ColorOption; // Override string with ColorOption type
  hasDeletedAncestor?: boolean;
}

// Document item based on FileResponseDto with UI properties
export interface DocumentItem extends FileResponseDto {
  cardType: 'document';
  hasDeletedAncestor?: boolean;
}

// Combined type
export type FileSystemItem = FolderItem | DocumentItem;
