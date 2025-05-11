import { useFileSystemStore } from '@/stores/useFileSystemStore';
import { useUploadStore } from '@/stores/useUploadStore';
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
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  
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

  // Function to process file entries recursively
  const processEntry = async (entry: FileSystemEntry, parentId: string | null) => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      
      return new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          const newFileId = `doc-${nanoid(6)}`;
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          
          // Create upload item
          const uploadId = addUpload(file, parentId);
          
          // Simulate upload progress (in real app, replace with actual upload logic)
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            updateUploadProgress(uploadId, progress);
            
            if (progress >= 100) {
              clearInterval(interval);
              setUploadStatus(uploadId, 'success');
              
              // Create file system item on successful upload with new structure
              addItem({
                id: newFileId,
                type: file.type.split('/')[0] || 'document',
                name: file.name,
                owner: 'user-1',
                folder: parentId,
                path: `/${file.name.toLowerCase().replace(/\s+/g, '-')}`,
                pathSegments: [],
                extension,
                size: file.size,
                isPinned: false,
                isShared: false,
                workspace: null,
                storageKey: `file-${nanoid()}.${extension}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null
              });
              
              resolve();
            }
          }, 500);
        });
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const newFolderId = `folder-${nanoid(6)}`;
      
      // Create upload item for folder
      const uploadId = addUpload({ 
        name: entry.name, 
        size: 0, 
        isFolder: true 
      }, parentId);
      
      // Simulate folder creation progress
      setTimeout(() => {
        setUploadStatus(uploadId, 'success');
        
        // Create folder item with new structure
        addItem({
          id: newFolderId,
          type: 'folder',
          name: entry.name,
          owner: 'user-1',
          parent: parentId,
          path: `/${entry.name.toLowerCase().replace(/\s+/g, '-')}`,
          pathSegments: [],
          items: 0,
          isPinned: false,
          isShared: false,
          workspace: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        });
      }, 1000);
      
      // Process directory contents
      const dirReader = dirEntry.createReader();
      const entries: FileSystemEntry[] = await readAllDirectoryEntries(dirReader);
      
      console.log(`Processing ${entries.length} entries in directory "${entry.name}"`);
      
      // Process all entries in the directory
      for (const childEntry of entries) {
        await processEntry(childEntry, newFolderId);
      }
    }
  };
  
  // Helper function to read all entries from a directory
  const readAllDirectoryEntries = async (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
    const entries: FileSystemEntry[] = [];
    let readEntries: FileSystemEntry[] = [];
    
    // Directory reader uses callbacks and may return results in chunks
    do {
      readEntries = await new Promise((resolve) => {
        reader.readEntries((results) => {
          resolve(Array.from(results));
        });
      });
      entries.push(...readEntries);
    } while (readEntries.length > 0);
    
    return entries;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Get the current folder ID where files are being dropped
    const targetFolderId = getCurrentFolderId();
    const targetFolderName = getCurrentFolderName();
    const currentLocation = window.location.pathname;

    console.log(`Items dropped on ${targetFolderId ? `folder "${targetFolderName}" (ID: ${targetFolderId})` : 'root directory'}`);
    console.log(`Current path: ${currentLocation}`);

    // Check if we have DataTransferItemList support
    if (e.dataTransfer.items) {
      console.log(`Processing ${e.dataTransfer.items.length} items...`);
      
      for (const item of Array.from(e.dataTransfer.items)) {
        // Skip if not file or directory
        if (item.kind !== 'file') {
          console.log('Skipping non-file item');
          continue;
        }
        
        // Get WebkitEntry (for directory support)
        const entry = item.webkitGetAsEntry();
        if (!entry) {
          console.log('No entry found for item, skipping');
          continue;
        }
        
        console.log(`Processing ${entry.isDirectory ? 'directory' : 'file'}: ${entry.name}`);
        await processEntry(entry, targetFolderId);
      }
    } else {
      // Fallback for browsers without DataTransferItemList support
      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        console.log(`Processing ${files.length} files (directory support unavailable)...`);
        
        Array.from(files).forEach(file => {
          // Create a new file item with new structure
          const newFileId = `doc-${nanoid(6)}`;
          
          // Determine file extension
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          
          // Create file system item with new structure
          addItem({
            id: newFileId,
            type: file.type.split('/')[0] || 'document',
            name: file.name,
            owner: 'user-1',
            folder: targetFolderId,
            path: `/${file.name.toLowerCase().replace(/\s+/g, '-')}`,
            pathSegments: [],
            extension,
            size: file.size,
            isPinned: false,
            isShared: false,
            workspace: null,
            storageKey: `file-${nanoid()}.${extension}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null
          });
          
          console.log(`Added file: "${file.name}" (Size: ${formatFileSize(file.size)}, Type: ${file.type}) to folder: ${targetFolderName} (${targetFolderId || 'root'})`);
        });
      }
    }
    
    console.log('Drop processing completed');
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