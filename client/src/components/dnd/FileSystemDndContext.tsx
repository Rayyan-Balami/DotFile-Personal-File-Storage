import { useFileSystemStore } from '@/stores/useFileSystemStore';
import { useSelectionStore } from '@/stores/useSelectionStore';
import { FileSystemItem } from '@/types/folderDocumnet';
import { Active, CollisionDetection, DndContext, DragEndEvent, DragOverEvent, DragStartEvent, MouseSensor, pointerWithin, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DragOverlay } from './DragOverlay';

// Context to provide drag-related state throughout the app
interface FileSystemDndContextType {
  activeId: string | null;
  active: Active | null;
  draggedItems: FileSystemItem[];
  isDragging: boolean;
  isOver: string | null;
  isOutsideDirectory: boolean;
  position: { x: number; y: number };
}

const FileSystemDndContextDefault: FileSystemDndContextType = {
  activeId: null,
  active: null,
  draggedItems: [],
  isDragging: false,
  isOver: null,
  isOutsideDirectory: false,
  position: { x: 0, y: 0 },
};

const FileSystemDndStateContext = createContext<FileSystemDndContextType>(FileSystemDndContextDefault);

export const useFileSystemDnd = () => useContext(FileSystemDndStateContext);

// Custom collision detection with proper boundary checking for breadcrumbs
const distanceBasedCollisionDetection: CollisionDetection = (args) => {
  const { droppableContainers, pointerCoordinates } = args;
  
  if (!pointerCoordinates) {
    return [];
  }

  // Get all potential collisions using pointer within detection
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length === 0) {
    return [];
  }

  // Filter collisions based on proper boundary checking for breadcrumb items
  const filteredCollisions = pointerCollisions.filter((collision) => {
    const droppable = droppableContainers.find(container => container.id === collision.id);
    if (!droppable) return true;
    
    // Check if this is a breadcrumb item by looking for breadcrumb-specific attributes
    const element = droppable.node.current;
    if (!element) return true;
    
    // Look for breadcrumb-specific selectors or data attributes
    const isBreadcrumb = element.closest('[data-breadcrumb-item]') || 
                        element.closest('.breadcrumb-nav') ||
                        element.getAttribute('data-breadcrumb') === 'true';
    
    if (!isBreadcrumb) {
      // For non-breadcrumb items, use default collision detection
      return true;
    }
    
    // For breadcrumb items, apply strict boundary checking with padding
    const rect = element.getBoundingClientRect();
    const padding = 8; // Small padding to make it slightly easier to target
    
    // Check if pointer is within the padded boundaries of the breadcrumb element
    const isWithinBounds = (
      pointerCoordinates.x >= rect.left - padding &&
      pointerCoordinates.x <= rect.right + padding &&
      pointerCoordinates.y >= rect.top - padding &&
      pointerCoordinates.y <= rect.bottom + padding
    );
    
    return isWithinBounds;
  });

  // Return the first filtered collision, maintaining the original collision detection priority
  return filteredCollisions.length > 0 ? [filteredCollisions[0]] : [];
};

interface FileSystemDndProviderProps {
  children: React.ReactNode;
}

export function FileSystemDndProvider({ children }: FileSystemDndProviderProps) {
  // Local state for drag and drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [draggedItems, setDraggedItems] = useState<FileSystemItem[]>([]);
  const [isOver, setIsOver] = useState<string | null>(null);
  const [isOutsideDirectory, setIsOutsideDirectory] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeId) return;
      
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Check if mouse is over any element with directory-view-container class
      const directoryEl = document.querySelector('.directory-view-container');
      if (!directoryEl) {
        setIsOutsideDirectory(true);
        return;
      }
      
      const rect = directoryEl.getBoundingClientRect();
      const isOutside = e.clientX < rect.left || 
                       e.clientX > rect.right || 
                       e.clientY < rect.top || 
                       e.clientY > rect.bottom;
      
      setIsOutsideDirectory(isOutside);
    };

    if (activeId) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Set initial position from the drag start event
    if (event.activatorEvent instanceof MouseEvent) {
      setPosition({ x: event.activatorEvent.clientX, y: event.activatorEvent.clientY });
    }
    
    const activeId = active.id as string;
    
    // Get the item being dragged
    const draggedItem = items[activeId];
    if (!draggedItem) {
      console.log('Drag start failed: Item not found', { activeId });
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
    
    // Early returns for invalid states
    if (!over) {
      setIsOver(null);
      return;
    }
    
    const overId = over.id as string;
    const overItem = items[overId];
    
    // Prevent self-drag
    if (active.id === overId) {
      console.log('🎯 Skipping self-drag:', { id: overId });
      setIsOver(null);
      return;
    }
    
    // Log drag over state
    console.log('🎯 Drag over:', { 
      target: overItem ? { 
        id: overItem.id, 
        name: overItem.name, 
        type: overItem.cardType 
      } : 'not found'
    });
    
    // Allow dropping on folders only
    if (!overItem || overItem.cardType !== 'folder') {
      setIsOver(null);
      return;
    }
    
    setIsOver(overId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Early returns for invalid states
    if (!over) {
      console.log('🚫 Drag cancelled: No target');
      resetDragState();
      return;
    }
    
    const overId = over.id as string;
    const overItem = items[overId];
    
    // Only allow dropping on folders
    if (!overItem || overItem.cardType !== 'folder') {
      console.log('🚫 Cannot drop: Target is not a folder');
      resetDragState();
      return;
    }
    
    // Prevent self-drop
    if (active.id === overId) {
      console.log('Drag cancelled: Cannot drop on self');
      resetDragState();
      return;
    }
    
    // Log drag end state
    console.log('🎯 Drag end:', {
      draggedItems: draggedItems.map(item => ({ 
        id: item.id, 
        name: item.name 
      })),
      target: overItem ? { 
        id: overItem.id, 
        name: overItem.name, 
        type: overItem.cardType 
      } : 'not found'
    });
    
    // Handle folder drops
    if (overItem?.cardType === 'folder') {
      // Move all dragged items to the target folder
      draggedItems.forEach(item => {
        console.log(`📦 Moving ${item.name} to ${overItem.name}`);
        moveItem(item.id, overId);
      });
      console.log('Move operation complete');
    } else {
      console.log('Cannot drop: Target is not a folder');
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
      collisionDetection={distanceBasedCollisionDetection}
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
          isOver,
          isOutsideDirectory,
          position
        }}
      >
        {children}
        <DragOverlay />
      </FileSystemDndStateContext.Provider>
    </DndContext>
  );
}