import { FileSystemItem, useFileSystemStore } from '@/stores/useFileSystemStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { Active, DndContext, DragEndEvent, DragOverEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import React, { createContext, useContext, useState } from 'react';
import { DragOverlay } from './DragOverlay';

// Context to provide drag-related state throughout the app
interface FileSystemDndContextType {
  activeId: string | null;
  active: Active | null; // Add active data
  draggedItems: FileSystemItem[];
  isDragging: boolean;
  isOver: string | null;
}

const FileSystemDndContextDefault: FileSystemDndContextType = {
  activeId: null,
  active: null, // Add active data
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
  const [active, setActive] = useState<Active | null>(null); // Store active element
  const [draggedItems, setDraggedItems] = useState<FileSystemItem[]>([]);
  const [isOver, setIsOver] = useState<string | null>(null);
  
  const moveItem = useFileSystemStore(state => state.moveItem);
  const items = useFileSystemStore(state => state.items);
  const selectedIds = useSelectionStore(state => state.selectedIds);
  const clearSelection = useSelectionStore(state => state.clear);
  
  // Configure sensors with appropriate delay and tolerance
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Delay to distinguish between click and drag
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      // Delay to allow for scrolling on touch devices
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
    setActive(active); // Store active data

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
        // Check for circular references (can't drop a folder into itself or its children)
        const canDrop = !draggedItems.some(item => {
          if (item.type !== 'folder') return false;
          
          // Check if the target folder is the item or one of its children
          if (item.id === overId) return true;
          
          if (!item.children) return false;
          
          const isChild = (parentId: string, childId: string): boolean => {
            const parent = items[parentId];
            if (!parent || !parent.children) return false;
            if (parent.children.includes(childId)) return true;
            return parent.children.some(id => isChild(id, childId));
          };
          
          return isChild(item.id, overId);
        });
        
        if (canDrop) {
          // Move all selected items
          draggedItems.forEach(item => moveItem(item.id, overId));
          
          // Log the successful drag operation
          console.log(`✅ Drag operation successful:`, {
            action: 'move',
            movedItems: draggedItems.map(item => ({ 
              id: item.id, 
              title: item.title, 
              type: item.type 
            })),
            targetFolder: {
              id: overItem.id,
              title: overItem.title
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
    
    // Reset drag state
    setActiveId(null);
    setDraggedItems([]);
    setIsOver(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActive(null); // Reset active data
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
          active, // Pass active data
          draggedItems, 
          isDragging: draggedItems.length > 0,
          isOver 
        }}
      >
        {children}
        
        {/* Render drag overlay */}
        <DragOverlay />
      </FileSystemDndStateContext.Provider>
    </DndContext>
  );
}