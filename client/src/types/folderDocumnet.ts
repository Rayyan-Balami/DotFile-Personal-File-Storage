import { ColorOption } from "@/config/colors";
import { FileResponseDto } from "@/types/file.dto";
import { FolderResponseDto } from "@/types/folder.dto";

// Folder item based on FolderResponseDto with UI properties
export interface FolderItem extends FolderResponseDto {
  cardType: "folder";
  color: ColorOption; // Override string with ColorOption type
  hasDeletedAncestor?: boolean;
}

// Document item based on FileResponseDto with UI properties
export interface DocumentItem extends FileResponseDto {
  cardType: "document";
  hasDeletedAncestor?: boolean;
}

// Combined type
export type FileSystemItem = FolderItem | DocumentItem;
