import { FileSystemItem, FolderItem, DocumentItem } from "@/types/folderDocumnet";
import { FolderResponseDto } from "@/types/folder.dto";
import { FileResponseDto } from "@/types/file.dto";

/**
 * Type guard to check if an item is a folder
 */
function isFolder(item: FolderResponseDto | FileResponseDto): item is FolderResponseDto {
  return 'type' in item && item.type === 'folder';
}

/**
 * Maps API response items to UI-ready FileSystemItems
 * This ensures consistent data structure for the UI components
 * by adding cardType and handling optional fields
 */
export function mapToFileSystemItem(item: FolderResponseDto | FileResponseDto): FileSystemItem {
  const baseItem = {
    id: item.id,
    name: item.name,
    owner: item.owner,
    isPinned: item.isPinned ?? false,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
    hasDeletedAncestor: item.hasDeletedAncestor ?? false,
  };

  if (isFolder(item)) {
    return {
      ...baseItem,
      type: 'folder',
      cardType: 'folder' as const,
      color: item.color ?? 'default',
      parent: item.parent,
      items: item.items ?? 0,
    } as FolderItem;
  } else {
    return {
      ...baseItem,
      type: item.type ?? 'application/octet-stream',
      cardType: 'document' as const,
      size: item.size ?? 0,
      folder: item.folder,
      storageKey: item.storageKey ?? '',
      extension: item.extension ?? '',
    } as DocumentItem;
  }
}
