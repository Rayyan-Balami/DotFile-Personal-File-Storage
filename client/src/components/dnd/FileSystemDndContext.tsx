import { useFileSystemStore } from '@/stores/useFileSystemStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { Active, DndContext, DragEndEvent, DragOverEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import React, { createContext, useContext, useState } from 'react';
import { DragOverlay } from './DragOverlay';
import { FileSystemItem, FolderItem } from '@/types/folderDocumnet';

// Context to provide drag-related state throughout the app
interface FileSystemDndContextType {
  activeId: string | null;
  active: Active | null;
  draggedItems: FileSystemItem[];
  isDragging: boolean;
  isOver: string | null;
}

const FileSystemDndContextDefault: FileSystemDndContextType = {
  activeId: null,
  active: null,
  draggedItems: [],
  isDragging: false,
  isOver: null,
};

const FileSystemDndStateContext = createContext<FileSystemDndContextType>(FileSystemDndContextDefault);

export const useFileSystemDnd = () => useContext(FileSystemDndStateContext);

interface FileSystemDndProviderProps {
  children: React.ReactNode;
}

export function FileSystemDndProvider({ children }: FileSystemDndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [draggedItems, setDraggedItems] = useState<FileSystemItem[]>([]);
  const [isOver, setIsOver] = useState<string | null>(null);
  
  const moveItem = useFileSystemStore(state => state.moveItem);
  const items = useFileSystemStore(state => state.items);
  const selectedIds = useSelectionStore(state => state.selectedIds);
  const clearSelection = useSelectionStore(state => state.clear);
  
  // Configure sensors with appropriate delay and tolerance
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Get the item being dragged
    const draggedItem = items[active.id as string];
    if (!draggedItem) return;

    setActiveId(active.id as string);
    setActive(active);

    // If the dragged item is selected, drag all selected items
    if (selectedIds.has(active.id as string) && selectedIds.size > 1) {
      const selectedItems = Array.from(selectedIds)
        .map(id => items[id])
        .filter(Boolean);
      setDraggedItems(selectedItems);
    } else {
      // Otherwise just drag the current item
      setDraggedItems([draggedItem]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setIsOver(null);
      return;
    }
    
    const overId = over.id as string;
    
    // Skip if hovering over itself or one of the dragged items
    if (
      active.id === overId || 
      draggedItems.some(item => item.id === overId)
    ) {
      setIsOver(null);
      return;
    }
    
    // Check if over is a folder
    const overItem = items[overId];
    if (overItem && overItem.type === 'folder') {
      setIsOver(overId);
    } else {
      setIsOver(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over) {
      const overId = over.id as string;
      const overItem = items[overId];
      
      // Check if we're dropping onto a folder
      if (overItem && overItem.type === 'folder') {
        const targetFolder = overItem as FolderItem;
        
        // Check for circular references (can't drop a folder into itself or its children)
        const canDrop = !draggedItems.some(item => {
          if (item.type !== 'folder') return false;
          const folderItem = item as FolderItem;
          
          // Check if the target folder is the item or one of its children
          if (folderItem.id === overId) return true;
          
          // Check parent path to avoid circular references
          let currentId = targetFolder.parent;
          while (currentId) {
            if (currentId === folderItem.id) return true;
            const parent = items[currentId];
            if (!parent || parent.type !== 'folder') break;
            currentId = (parent as FolderItem).parent;
          }
          
          return false;
        });
        
        if (canDrop) {
          // Move all selected items
          draggedItems.forEach(item => moveItem(item.id, overId));
          
          // Log the successful drag operation
          console.log(`✅ Drag operation successful:`, {
            action: 'move',
            movedItems: draggedItems.map(item => ({ 
              id: item.id, 
              name: item.name, 
              type: item.type 
            })),
            targetFolder: {
              id: overItem.id,
              name: overItem.name
            }
          });
        } else {
          console.log(`❌ Drag operation failed: Cannot move folders into themselves or their children`);
        }
      } else {
        console.log(`❌ Drag operation failed: Target is not a folder`);
      }
    } else {
      console.log(`❌ Drag operation cancelled: No valid drop target`);
    }
    
    // Clear selection and reset drag state
    clearSelection();
    setActiveId(null);
    setActive(null);
    setDraggedItems([]);
    setIsOver(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActive(null);
    setDraggedItems([]);
    setIsOver(null);
  };
  
  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <FileSystemDndStateContext.Provider 
        value={{ 
          activeId, 
          active,
          draggedItems, 
          isDragging: draggedItems.length > 0,
          isOver 
        }}
      >
        {children}
        <DragOverlay />
      </FileSystemDndStateContext.Provider>
    </DndContext>
  );
}