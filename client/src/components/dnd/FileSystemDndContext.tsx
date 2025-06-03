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

  // FIRST: Manual portal detection for breadcrumb dropdown items
  // Check all registered dropdown items for direct collision with pointer
  const portalDropdownItems = Array.from(droppableContainers).filter(container => {
    const id = String(container.id);
    return id.startsWith('breadcrumb-dropdown-') && 
           id !== 'breadcrumb-dropdown-trigger' && 
           id !== 'breadcrumb-dropdown-content';
  });

  // Check for direct collision with portal dropdown items
  const portalCollisions = portalDropdownItems.filter(container => {
    if (!container.node.current) return false;
    
    const rect = container.node.current.getBoundingClientRect();
    const isWithinBounds = (
      pointerCoordinates.x >= rect.left &&
      pointerCoordinates.x <= rect.right &&
      pointerCoordinates.y >= rect.top &&
      pointerCoordinates.y <= rect.bottom
    );
    
    if (isWithinBounds) {
      // Portal element collision detected
    }
    
    return isWithinBounds;
  });

  // If we found portal collisions, prioritize them
  if (portalCollisions.length > 0) {
    return [{
      id: portalCollisions[0].id,
      data: portalCollisions[0].data
    }];
  }

  // Get all potential collisions using pointer within detection
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length === 0) {
    return [];
  }

  // Separate breadcrumb dropdown collisions
  const breadcrumbDropdownItemCollisions = pointerCollisions.filter(collision => {
    const id = String(collision.id);
    return id.startsWith('breadcrumb-dropdown-') && id !== 'breadcrumb-dropdown-trigger' && id !== 'breadcrumb-dropdown-content';
  });
  
  const breadcrumbTriggerCollisions = pointerCollisions.filter(collision => 
    String(collision.id) === 'breadcrumb-dropdown-trigger'
  );
  
  const breadcrumbContentCollisions = pointerCollisions.filter(collision => 
    String(collision.id) === 'breadcrumb-dropdown-content'
  );
  
  // Prioritize actual dropdown items over triggers and content
  if (breadcrumbDropdownItemCollisions.length > 0) {
    return [breadcrumbDropdownItemCollisions[0]];
  }
  
  // If we have content area collision, check if there are dropdown items within the content
  if (breadcrumbContentCollisions.length > 0) {
    // Look for dropdown items that might be overlapping with content
    const contentContainer = droppableContainers.find(container => container.id === 'breadcrumb-dropdown-content');
    if (contentContainer && contentContainer.node.current) {
      // Check if any dropdown items are within the content area
      const dropdownItemsInContent = droppableContainers.filter(container => {
        const id = String(container.id);
        if (!id.startsWith('breadcrumb-dropdown-') || id === 'breadcrumb-dropdown-trigger' || id === 'breadcrumb-dropdown-content') {
          return false;
        }
        
        if (container.node.current) {
          const itemRect = container.node.current.getBoundingClientRect();
          return (
            pointerCoordinates.x >= itemRect.left &&
            pointerCoordinates.x <= itemRect.right &&
            pointerCoordinates.y >= itemRect.top &&
            pointerCoordinates.y <= itemRect.bottom
          );
        }
        return false;
      });
      
      if (dropdownItemsInContent.length > 0) {
        return [{
          id: dropdownItemsInContent[0].id,
          data: dropdownItemsInContent[0].data
        }];
      }
    }
  }
  
  if (breadcrumbTriggerCollisions.length > 0) {
    // Handle breadcrumb trigger collisions
  }

  // Filter collisions based on proper boundary checking for breadcrumb items
  const filteredCollisions = pointerCollisions.filter((collision) => {
    const droppable = droppableContainers.find(container => container.id === collision.id);
    if (!droppable) return true;
    
    // Check if this is a breadcrumb item by looking for breadcrumb-specific attributes
    const element = droppable.node.current;
    if (!element) return true;
    
    // Check if this is a breadcrumb dropdown item by ID
    const droppableId = String(collision.id);
    const isBreadcrumbDropdownItem = droppableId.startsWith('breadcrumb-dropdown-') && 
                                    droppableId !== 'breadcrumb-dropdown-trigger' && 
                                    droppableId !== 'breadcrumb-dropdown-content';
    
    // For actual breadcrumb dropdown items, always allow collision
    if (isBreadcrumbDropdownItem) {
      return true;
    }
    
    // For trigger and content areas, allow but with lower priority (they're already handled above)
    if (droppableId === 'breadcrumb-dropdown-trigger' || droppableId === 'breadcrumb-dropdown-content') {
      return true;
    }
    
    // Look for breadcrumb-specific selectors or data attributes
    const isBreadcrumb = element.closest('[data-breadcrumb-item]') || 
                        element.closest('.breadcrumb-nav') ||
                        element.getAttribute('data-breadcrumb') === 'true';
    
    if (!isBreadcrumb) {
      // For non-breadcrumb items, use default collision detection
      return true;
    }
    
    // For regular breadcrumb items, apply strict boundary checking with padding
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
      return;
    }



    setActiveId(activeId);
    setActive(active);

    // If the dragged item is selected, drag all selected items
    if (selectedIds.has(activeId) && selectedIds.size > 1) {
      const selectedItems = Array.from(selectedIds)
        .map(id => items[id])
        .filter(Boolean);
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
    let overItem = items[overId];
    
    // Handle breadcrumb dropdown items
    if (overId.startsWith('breadcrumb-dropdown-') && !overItem) {
      // First, try to get the item from the over.data
      if (over.data?.current) {
        const breadcrumbData = over.data.current as any;
        if (breadcrumbData.type === 'folder' && breadcrumbData.item) {
          overItem = breadcrumbData.item;
        }
      }
      
      // If still not found, try extracting from store
      if (!overItem) {
        const originalId = overId.replace('breadcrumb-dropdown-', '');
        overItem = items[originalId] || items['root'];
      }
    }
    
    // Handle special breadcrumb areas (trigger, content)
    if (overId === 'breadcrumb-dropdown-trigger') {
      // When dragging over trigger, check if dropdown is open and we should target the root folder
      // This is a fallback when the dropdown items aren't properly detected due to portal positioning
      
      // Try to find a root folder item to use as target
      const rootFolder = items['root'] || Object.values(items).find(item => 
        item.cardType === 'folder' && (item.id === 'root' || item.parent === null)
      );
      
      if (rootFolder) {
        overItem = rootFolder;
      } else {
        setIsOver(null);
        return;
      }
    } else if (overId === 'breadcrumb-dropdown-content') {
      // These are UI elements, not drop targets - just track for dropdown behavior
      setIsOver(null);
      return;
    }
    
    // Prevent self-drag
    if (active.id === overId) {
      setIsOver(null);
      return;
    }
    
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
      resetDragState();
      return;
    }
    
    const overId = over.id as string;
    let overItem = items[overId];
    
    // Handle breadcrumb dropdown items
    if (overId.startsWith('breadcrumb-dropdown-') && !overItem) {
      // First, try to get the item from the over.data
      if (over.data?.current) {
        const breadcrumbData = over.data.current as any;
        if (breadcrumbData.type === 'folder' && breadcrumbData.item) {
          overItem = breadcrumbData.item;
        }
      }
      
      // If still not found, try extracting from store
      if (!overItem) {
        const originalId = overId.replace('breadcrumb-dropdown-', '');
        overItem = items[originalId] || items['root'];
      }
    }
    
    // Handle special breadcrumb areas (trigger, content)  
    if (overId === 'breadcrumb-dropdown-trigger' && !overItem) {
      // When dropping on trigger, check if dropdown is open and we should target the root folder
      // This is a fallback when the dropdown items aren't properly detected due to portal positioning
      
      // Try to find a root folder item to use as target
      const rootFolder = items['root'] || Object.values(items).find(item => 
        item.cardType === 'folder' && (item.id === 'root' || item.parent === null)
      );
      
      if (rootFolder) {
        overItem = rootFolder;
      } else {
        resetDragState();
        return;
      }
    } else if (overId === 'breadcrumb-dropdown-content') {
      resetDragState();
      return;
    }

    // Only allow dropping on folders
    if (!overItem || overItem.cardType !== 'folder') {
      resetDragState();
      return;
    }
    
    // Prevent self-drop
    if (active.id === overId) {
      resetDragState();
      return;
    }
    
    // For breadcrumb dropdown items, also check the original item ID
    if (overId.startsWith('breadcrumb-dropdown-') && overItem) {
      const originalId = overId.replace('breadcrumb-dropdown-', '');
      if (active.id === originalId || active.id === overItem.id) {
        resetDragState();
        return;
      }
    } else if (active.id === overItem?.id) {
      resetDragState();
      return;
    }
    
    // Handle folder drops
    if (overItem?.cardType === 'folder') {
      // Log the drop operation for monitoring
      console.log('📦 Drop completed:', {
        items: draggedItems.map(item => item.name),
        target: overItem.name,
        targetId: overItem.id,
        dropType: overId.startsWith('breadcrumb-dropdown-') ? 'breadcrumb' : 'folder'
      });
      
      // Move all dragged items to the target folder
      draggedItems.forEach(item => {
        moveItem(item.id, overItem.id);
      });
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