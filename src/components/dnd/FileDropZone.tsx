import { useFileSystemStore } from '@/store/useFileSystemStore';
import { useParams } from '@tanstack/react-router';
import { nanoid } from 'nanoid';
import React, { useCallback, useState } from 'react';

interface FileDropZoneProps {
  children: React.ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // Use strict: false to make useParams work anywhere in the component tree
  const params = useParams({ strict: false });
  const addItem = useFileSystemStore(state => state.addItem);
  
  // Get current folder ID from URL or use root
  const getCurrentFolderId = () => {
    // Check if we're in a folder route with folderId parameter
    const folderId = params.id;
    
    return folderId || null;
  };

  const getCurrentFolderName = () => {
    const folderId = getCurrentFolderId();
    if (!folderId) return "Root";
    
    const items = useFileSystemStore.getState().items;
    return items[folderId]?.title || "Unknown Folder";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show drop effect if files are being dragged
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Get the current folder ID where files are being dropped
    const targetFolderId = getCurrentFolderId();
    const targetFolderName = getCurrentFolderName();
    const currentLocation = window.location.pathname;

    console.log(`Files dropped on ${targetFolderId ? `folder "${targetFolderName}" (ID: ${targetFolderId})` : 'root directory'}`);
    console.log(`Current path: ${currentLocation}`);

    // Process dropped files
    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        // Create a new file item
        const newFileId = `doc-${nanoid(6)}`;
        
        // Determine file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        
        // Create file system item
        addItem({
          id: newFileId,
          type: 'document',
          title: file.name,
          parentId: targetFolderId,
          fileExtension,
          byteCount: file.size,
          dateModified: new Date().toISOString(),
          dateAdded: new Date().toISOString(),
        });
        
        console.log(`Added file: "${file.name}" (Size: ${formatFileSize(file.size)}, Type: ${file.type}) to folder: ${targetFolderName} (${targetFolderId || 'root'})`);
      });
    }
  }, [addItem, params.id]);

  return (
    <div 
      className="relative flex-1 flex flex-col h-full" 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Drop overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none z-50 border-2 border-primary border-dashed flex items-center justify-end rounded-md"/>
      )}
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}