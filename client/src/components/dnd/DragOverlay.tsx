import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import FolderDocumentCard from '../cards/FolderDocumentCard';
import { useFileSystemDnd } from './FileSystemDndContext';
import { FileSystemItem, FolderItem, DocumentItem } from '@/types/folderDocumnet';

// Define a type for drag data
interface DragData {
  id: string;
  type: "folder" | "document";
  name: string;
  variant?: "large" | "compact" | "list";
  item: FileSystemItem;
}

export function DragOverlay() {
  const { activeId, draggedItems, active, isOutsideDirectory } = useFileSystemDnd();
  
  if (!activeId || !draggedItems.length || !active) {
    return null;
  }
  
  // Get the primary dragged item
  const primaryItem = draggedItems[0];
  
  // Extract data from the active drag element with proper typing
  const data = active.data.current as DragData;
  
  // Use the item from drag data or create a fallback item based on type
  const item: FileSystemItem = data.item || (
    primaryItem.cardType === "folder" 
      ? {
          id: primaryItem.id,
          type: "folder",
          cardType: "folder",
          name: primaryItem.name || "Untitled",
          owner: "",
          color: "blue", // Valid ColorOption
          parent: null,
          items: 0,
          isPinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        } as FolderItem
      : {
          id: primaryItem.id,
          type: "application/octet-stream", // Default MIME type
          cardType: "document",
          name: primaryItem.name || "Untitled",
          owner: "",
          folder: null,
          extension: "",
          size: 0,
          isPinned: false,
          storageKey: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        } as DocumentItem
  );
  
  const variant = data.variant || "large";
  
  // Scale down when outside directory, scale to 90% when inside
  const scaleClass = isOutsideDirectory ? "scale-40" : "scale-90";
  
  return (
    <DndKitDragOverlay>
      <div className="pointer-events-none">
        <FolderDocumentCard
          item={item}
          variant={variant}
          className={`shadow-lg ring-1 ring-primary/30 ${scaleClass}`}
        />
        
        {draggedItems.length > 1 && (
          <div className="absolute top-1 right-0 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            +{draggedItems.length - 1}
          </div>
        )}
      </div>
    </DndKitDragOverlay>
  );
}