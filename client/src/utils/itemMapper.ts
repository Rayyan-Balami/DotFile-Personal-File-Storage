import { FileSystemItem, FolderItem, DocumentItem } from "@/types/folderDocumnet";
import { FolderResponseDto } from "@/types/folder.dto";

export function mapToFileSystemItem(item: any): FileSystemItem {
  const baseItem = {
    id: item.id,
    name: item.name || item.title, // handle both name and title
    owner: item.owner,
    isPinned: item.isPinned || false,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
  };

  if (item.type === 'folder') {
    return {
      ...baseItem,
      type: 'folder',
      cardType: 'folder' as const,
      color: item.color || '#4f46e5',
      parent: item.parent,
      items: item.items || 0,
    } as FolderItem;
  } else {
    return {
      ...baseItem,
      type: item.type || 'application/octet-stream',
      cardType: 'document' as const,
      size: item.size || 0,
      folder: item.folder as FolderResponseDto | null,
      storageKey: item.storageKey || '',
      extension: item.extension || '',
    } as DocumentItem;
  }
}
