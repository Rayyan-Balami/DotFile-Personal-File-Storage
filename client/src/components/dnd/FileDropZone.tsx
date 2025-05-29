import { useUploadFiles } from '@/api/file/file.query';
import { useFileSystemStore } from '@/stores/useFileSystemStore';
import { useUploadStore } from '@/stores/useUploadStore';
import { DocumentItem } from '@/types/folderDocumnet';
import { getDetailedErrorInfo } from '@/utils/apiErrorHandler';
import { collectFilesFromDirectory, createZipFromFiles } from '@/utils/uploadUtils';
import { useMatches, useParams } from '@tanstack/react-router';
import { nanoid } from 'nanoid';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface FileDropZoneProps {
  children: React.ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // Use strict: false to make useParams work anywhere in the component tree
  const params = useParams({ strict: false });
  const matches = useMatches();
  const addItem = useFileSystemStore(state => state.addItem);
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const uploadFiles = useUploadFiles();

  // Route detection to determine current context
  const trashMatch = matches.find(match => match.routeId.includes('/(user)/trash'));
  const recentMatch = matches.find(match => match.routeId.includes('/(user)/recent'));
  
  // Determine if we're in a read-only context (trash or recent)
  const isInTrashContext = !!trashMatch;
  const isInRecentContext = !!recentMatch;
  const isReadOnlyContext = isInTrashContext || isInRecentContext;

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
    return items[folderId]?.name || "Unknown Folder";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show drop effect if files are being dragged and not in read-only context
    if (e.dataTransfer.types.includes('Files') && !isReadOnlyContext) {
      setIsDraggingOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isReadOnlyContext]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  // Function to handle server upload for individual files
  const uploadToServer = async (files: File[], uploadId: string, parentId: string | null = null) => {
    try {
      await uploadFiles.mutateAsync({
        files,
        folderData: parentId ? { folderId: parentId } : undefined,
        onProgress: (progress) => {
          updateUploadProgress(uploadId, progress);
        },
        uploadId
      });
      setUploadStatus(uploadId, 'success');
      return true;
    } catch (error) {
      console.error('Upload failed:', error);
      
      // Don't update status for cancelled uploads
      if (error instanceof Error && error.message === 'Upload cancelled') {
        return false;
      }
      
      // Get detailed error information
      const errorInfo = getDetailedErrorInfo(error);
      
      // Show main error message
      toast.error(errorInfo.message);
      
      // Show individual file errors if available
      if (errorInfo.details?.length > 1) {
        errorInfo.details.slice(1).forEach(detail => {
          toast.error(detail, { duration: 5000 });
        });
      }
      
      setUploadStatus(uploadId, 'error');
      return false;
    }
  };

  // Function to process dropped directories
  const processDroppedDirectory = async (items: DataTransferItemList, parentId: string | null) => {
    // Create a dummy input to use with processDirectoryInput
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    
    // Convert DataTransferItemList to FileList and store files
    const files: File[] = [];
    const directories: FileSystemDirectoryEntry[] = [];
    
    for (const item of Array.from(items)) {
      if (item.kind !== 'file') continue;
      
      const entry = item.webkitGetAsEntry();
      if (!entry) continue;

      if (entry.isDirectory) {
        directories.push(entry as FileSystemDirectoryEntry);
      } else {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });
        files.push(file);
      }
    }

    // Process directories one by one to maintain folder structure
    for (const dirEntry of directories) {
      const dirFiles = await collectFilesFromDirectory(dirEntry);
      const folderName = dirEntry.name;
      
      // Create upload entry for tracking (in creating-zip state)
      const totalSize = dirFiles.reduce((sum, entry) => sum + entry.file.size, 0);
      const uploadId = addUpload({ name: `${folderName}.zip`, size: totalSize, isFolder: true }, parentId);
      
      try {
        // Create zip file with progress tracking
        const progressCallback = (progress: number) => {
          updateUploadProgress(uploadId, progress);
          if (progress === 100) {
            setUploadStatus(uploadId, 'uploading');
          }
        };

        // Add root folder to each file's path
        const filesWithRootFolder = dirFiles.map(entry => ({
          file: entry.file,
          path: `${folderName}/${entry.path}` // Include root folder in path
        }));

        const zipFile = await createZipFromFiles(filesWithRootFolder, folderName, progressCallback);

        // Upload the zip file
        await uploadFiles.mutateAsync({
          files: [zipFile],
          folderData: parentId ? { folderId: parentId } : undefined,
          onProgress: (progress) => {
            updateUploadProgress(uploadId, progress);
          },
          uploadId
        });

        // Update upload to success
        setUploadStatus(uploadId, 'success');
        toast.success(`Successfully uploaded folder "${folderName}"`);
      } catch (error) {
        console.error('Folder upload failed:', error);
        
        if (error instanceof Error && error.message === 'Upload cancelled') {
          continue;
        }
        
        const errorInfo = getDetailedErrorInfo(error);
        toast.error(errorInfo.message);
        
        setUploadStatus(uploadId, 'error');
      }
    }

    // Handle regular files if any
    for (const file of files) {
      const uploadId = addUpload(file, parentId);
      await uploadToServer([file], uploadId, parentId);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Prevent file dropping in read-only contexts
    if (isReadOnlyContext) {
      toast.error("Cannot upload files in this view");
      return;
    }

    const targetFolderId = getCurrentFolderId();

    // Handle dropped items
    if (e.dataTransfer.items) {
      // First, separate files and directories
      const files: File[] = [];
      const hasDirectories = Array.from(e.dataTransfer.items).some(
        item => item.webkitGetAsEntry()?.isDirectory
      );

      if (hasDirectories) {
        // Process directories using the new method
        await processDroppedDirectory(e.dataTransfer.items, targetFolderId);
      }

      // Collect individual files
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind !== 'file') continue;
        
        const entry = item.webkitGetAsEntry();
        if (!entry || entry.isDirectory) continue;

        const file = item.getAsFile();
        if (file) files.push(file);
      }

      // Upload individual files
      for (const file of files) {
        const uploadId = addUpload(file, targetFolderId);
        const success = await uploadToServer([file], uploadId, targetFolderId);
        
        if (success) {
          const newFile: DocumentItem = {
            id: `doc-${nanoid(6)}`,
            type: file.type || 'application/octet-stream',
            cardType: 'document',
            name: file.name,
            owner: 'user-1',
            folder: targetFolderId ? {
              id: targetFolderId,
              name: getCurrentFolderName(),
              type: 'folder',
              owner: 'user-1',
              color: 'blue',
              parent: null,
              items: 0,
              isPinned: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null
            } : null,
            extension: file.name.split('.').pop()?.toLowerCase() || '',
            size: file.size,
            isPinned: false,
            storageKey: `file-${nanoid()}.${file.name.split('.').pop()?.toLowerCase() || ''}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null
          };
          addItem(newFile);
        }
      }
    } else if (e.dataTransfer.files?.length > 0) {
      // Fallback for browsers without FileSystemAPI support
      for (const file of Array.from(e.dataTransfer.files)) {
        const uploadId = addUpload(file, targetFolderId);
        const success = await uploadToServer([file], uploadId, targetFolderId);
        
        if (success) {
          const newFile: DocumentItem = {
            id: `doc-${nanoid(6)}`,
            type: file.type || 'application/octet-stream',
            cardType: 'document',
            name: file.name,
            owner: 'user-1',
            folder: targetFolderId ? {
              id: targetFolderId,
              name: getCurrentFolderName(),
              type: 'folder',
              owner: 'user-1',
              color: 'blue',
              parent: null,
              items: 0,
              isPinned: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null
            } : null,
            extension: file.name.split('.').pop()?.toLowerCase() || '',
            size: file.size,
            isPinned: false,
            storageKey: `file-${nanoid()}.${file.name.split('.').pop()?.toLowerCase() || ''}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null
          };
          addItem(newFile);
        }
      }
    }
  }, [addItem, addUpload, getCurrentFolderId, getCurrentFolderName, uploadFiles]);

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