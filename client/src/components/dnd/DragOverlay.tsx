import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import FolderDocumentCard from '../cards/FolderDocumentCard';
import { useFileSystemDnd } from './FileSystemDndContext';
import { FileSystemItem, FolderItem, DocumentItem } from '@/types/folderDocumnet';
import { useEffect, useState } from 'react';
import { File, Folder } from 'lucide-react';

// Define a type for drag data
interface DragData {
  id: string;
  type: "folder" | "document";
  name: string;
  variant?: "large" | "compact" | "list";
  item: FileSystemItem;
}

export function DragOverlay() {
  const { activeId, draggedItems, active, isOutsideDirectory, position } = useFileSystemDnd();
  
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

  // Render minimal card when outside directory
  if (isOutsideDirectory) {
    return (
      <div
        className="pointer-events-none fixed bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-[9999]"
        style={{
          left: position.x,
          top: position.y,
          position: 'fixed',
          maxWidth: '150px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {item.cardType === 'folder' ? (
          <Folder className="w-4 h-4 shrink-0" />
        ) : (
          <File className="w-4 h-4 shrink-0" />
        )}
        <span className="text-sm font-medium truncate">{item.name}</span>
        {draggedItems.length > 1 && (
          <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            +{draggedItems.length - 1}
          </div>
        )}
      </div>
    );
  }
  
  // Render normal card when inside directory with manual transform
  return (
    <DndKitDragOverlay
      dropAnimation={null}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div 
        className="relative"
        style={{
          // transform: 'translate(-50%, -50%)',
        }}
      >
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