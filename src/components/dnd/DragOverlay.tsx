import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import FolderDocumentCard from '../cards/FolderDocumentCard';
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
  childCount?: number;
  byteCount?: number;
  isPinned?: boolean;
  users?: Array<{ image?: string; fallback: string }>;
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
    title = primaryItem.title || "Untitled",
    color = "default",
    fileExtension = "pdf",
    previewUrl,
    childCount,
    byteCount,
    isPinned = false,
    users = []
  } = data;
  
  return (
    <DndKitDragOverlay>
      <div className="pointer-events-none">
        <FolderDocumentCard
          id={primaryItem.id}
          type={type}
          title={title}
          childCount={childCount}
          byteCount={byteCount}
          users={users}
          color={color}
          fileExtension={fileExtension}
          previewUrl={previewUrl}
          isPinned={isPinned}
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