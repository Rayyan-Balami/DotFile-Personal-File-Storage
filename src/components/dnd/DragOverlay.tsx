import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import FolderDocumentCard from '../cards/FolderDocumnetCard';
import { useFileSystemDnd } from './FileSystemDndContext';

// Define a type for drag data to help TypeScript understand the structure
interface DragData {
  id: string;
  type: "folder" | "document";
  title: string;
  variant?: "large" | "compact" | "list";
  color?: string;
  fileExtension?: string;
  previewUrl?: string;
  itemCount?: number;
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
  
  // Use safe defaults for all required props
  const {
    variant = "large",
    type = primaryItem.type,
    title = primaryItem.title || "Untitled", // Title is required
    color = "default",
    fileExtension = "pdf",
    previewUrl,
    itemCount
  } = data;
  
  return (
    <DndKitDragOverlay>
      <div className="pointer-events-none">
        <FolderDocumentCard
          id={primaryItem.id}
          type={type}
          title={title}
          itemCount={itemCount}
          color={color}
          fileExtension={fileExtension}
          previewUrl={previewUrl}
          // Use the same variant as the original card
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