import { useFileSystemStore } from '@/stores/useFileSystemStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { Active, DndContext, DragEndEvent, DragOverEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import React, { createContext, useContext, useState } from 'react';
import { DragOverlay } from './DragOverlay';
import { FileSystemItem } from '@/types/folderDocumnet';

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
  // Local state for drag and drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [draggedItems, setDraggedItems] = useState<FileSystemItem[]>([]);
  const [isOver, setIsOver] = useState<string | null>(null);
  
  // Store hooks
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
    const activeId = active.id as string;
    
    // Get the item being dragged
    const draggedItem = items[activeId];
    if (!draggedItem) {
      console.log('❌ Drag start failed: Item not found', { activeId });
      return;
    }

    console.log('📦 Drag start:', { 
      item: { id: draggedItem.id, name: draggedItem.name, type: draggedItem.cardType }
    });

    setActiveId(activeId);
    setActive(active);

    // If the dragged item is selected, drag all selected items
    if (selectedIds.has(activeId) && selectedIds.size > 1) {
      const selectedItems = Array.from(selectedIds)
        .map(id => items[id])
        .filter(Boolean);
      console.log('📦 Dragging multiple items:', selectedItems.map(item => ({ id: item.id, name: item.name })));
      setDraggedItems(selectedItems);
    } else {
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
    const overItem = items[overId];
    
    // Skip if dragging over the same item
    if (active.id === overId) {
      console.log('🎯 Skipping self-drag:', { id: overId });
      setIsOver(null);
      return;
    }
    
    console.log('🎯 Drag over:', { 
      target: overItem ? { id: overItem.id, name: overItem.name, type: overItem.cardType } : 'not found'
    });
    
    // Only allow dropping on folders
    if (overItem?.cardType === 'folder') {
      setIsOver(overId);
    } else {
      setIsOver(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      console.log('❌ Drag cancelled: No target');
      resetDragState();
      return;
    }
    
    const overId = over.id as string;
    const overItem = items[overId];
    
    // Skip if dragging to self
    if (active.id === overId) {
      console.log('❌ Drag cancelled: Cannot drop on self');
      resetDragState();
      return;
    }
    
    console.log('🎯 Drag end:', {
      draggedItems: draggedItems.map(item => ({ id: item.id, name: item.name })),
      target: overItem ? { id: overItem.id, name: overItem.name, type: overItem.cardType } : 'not found'
    });
    
    // Check if target is a folder
    if (overItem?.cardType === 'folder') {
      // Move all dragged items to the target folder
      draggedItems.forEach(item => {
        console.log(`📦 Moving ${item.name} to ${overItem.name}`);
        moveItem(item.id, overId);
      });
      console.log('✅ Move operation complete');
    } else {
      console.log('❌ Cannot drop: Target is not a folder');
    }
    
    resetDragState();
  };

  const handleDragCancel = () => {
    resetDragState();
  };
  
  const resetDragState = () => {
    clearSelection();
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