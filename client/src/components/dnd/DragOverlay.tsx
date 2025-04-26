import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import FolderDocumentCard from '../cards/FolderDocumentCard';
import { useFileSystemDnd } from './FileSystemDndContext';
import { FileSystemItem } from '@/types/folderDocumnet';

// Define a type for drag data to help TypeScript understand the structure
interface DragData {
  id: string;
  type: "folder" | "document";
  title: string;
  variant?: "large" | "compact" | "list";
  item: FileSystemItem;
  [key: string]: any; // Allow other props
}

export function DragOverlay() {
  const { activeId, draggedItems, active } = useFileSystemDnd();
  
  if (!activeId || !draggedItems.length || !active) {
    return null;
  }
  
  // Get the primary dragged item
  const primaryItem = draggedItems[0];
  
  // Extract data from the active drag element with proper typing
  const data = active.data.current as DragData;
  
  // Use the item from drag data or fallback to a simple structure
  const item = data.item || {
    id: primaryItem.id,
    type: primaryItem.type || "folder",
    title: primaryItem.title || "Untitled",
    dateModified: new Date().toISOString(),
    ownerId: "",
    parentFolderId: null,
    dateAdded: new Date().toISOString(),
    trashedAt: null,
    isPinned: false,
    sharedUsersPreview: [],
  };
  
  const variant = data.variant || "large";
  
  return (
    <DndKitDragOverlay>
      <div className="pointer-events-none">
        <FolderDocumentCard
          item={item}
          variant={variant}
          className="shadow-lg ring-1 ring-primary/30 scale-90"
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