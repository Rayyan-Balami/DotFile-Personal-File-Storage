import React, { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useFileSystemDnd } from '@/components/dnd/FileSystemDndContext';
import FolderDocumentCard from './FolderDocumentCard';
import { cn } from '@/lib/utils';

// Import the props type from FolderDocumentCard
type FolderDocumentCardProps = React.ComponentProps<typeof FolderDocumentCard>;

// Extend the props to ensure all required props are included
interface DraggableFolderCardProps extends Omit<FolderDocumentCardProps, 'className'> {
  className?: string;
}

export const DraggableFolderCard = memo(({
  id,
  type,
  title, // Now TypeScript knows this is required
  variant = "large",
  ...props
}: DraggableFolderCardProps) => {
  // Set up drag handlers with full card data
  const { attributes, listeners, setNodeRef: setDragNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type,
      id,
      title,
      variant,
      ...props
    }
  });

  // Set up drop handlers for folders only
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id,
    disabled: type !== 'folder',
  });

  // Get global drag state
  const { isOver: globalIsOver } = useFileSystemDnd();
  
  // Combine refs for both drag and drop
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    if (type === 'folder') {
      setDropNodeRef(node);
    }
  };
  
  // Keep the card visible while dragging, but apply ghost effect
  const isDropTarget = globalIsOver === id;
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-500 relative ",
      )}
      {...attributes}
      {...listeners}
    >
      <FolderDocumentCard
        id={id}
        type={type}
        title={title}
        variant={variant}
        {...props}
        className={cn(
          props.className,
          // Apply ghost effect but keep it visible
          isDragging && "opacity-30 grayscale blur-[0.3px] pointer-events-none",
          isDropTarget && "border-transparent"
        )}
      />
      
      {/* Drop indicator overlay - shown when hovering over a folder */}
      {isDropTarget && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none rounded-md z-10 border-2 border-primary border-dashed" />
      )}
    </div>
  );
});

DraggableFolderCard.displayName = 'DraggableFolderCard';