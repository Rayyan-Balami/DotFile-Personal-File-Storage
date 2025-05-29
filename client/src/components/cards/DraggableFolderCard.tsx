import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { useUploadStore } from "@/stores/useUploadStore";
import { FileSystemItem, DocumentItem, FolderItem } from "@/types/folderDocumnet";
import { createZipFromFiles, collectFilesFromDirectory } from "@/utils/uploadUtils";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { useUploadFiles } from "@/api/file/file.query";
import { nanoid } from "nanoid";
import React, { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import FolderDocumentCard, { CardVariant } from "./FolderDocumentCard";
import { UploadItem } from "@/stores/useUploadStore";

interface DraggableFolderCardProps {
  item: FileSystemItem;
  variant?: CardVariant;
  alternateBg?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onOpen?: () => void;
}

export const DraggableFolderCard = memo(
  ({
    item,
    variant = "large",
    className,
    alternateBg = false,
    onClick,
    onOpen,
  }: DraggableFolderCardProps) => {
    const { id, name, owner } = item;
    const color = item.cardType === 'folder' ? item.color : undefined;
    const addItem = useFileSystemStore(state => state.addItem);
    const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
    const uploadFiles = useUploadFiles();

    // Drag handling states
    const [isDraggingOver, setIsDraggingOver] = useState(false);

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

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        // Handle dropped items
        if (e.dataTransfer.items) {
          const hasDirectories = Array.from(e.dataTransfer.items).some(
            item => item.webkitGetAsEntry()?.isDirectory
          );

          if (hasDirectories) {
            // Convert DataTransferItemList to arrays for processing
            const directories: FileSystemDirectoryEntry[] = [];
            const individualFiles: File[] = [];

            // Separate directories and files
            for (const item of Array.from(e.dataTransfer.items)) {
              if (item.kind !== "file") continue;
              
              const entry = item.webkitGetAsEntry();
              if (!entry) continue;

              if (entry.isDirectory) {
                directories.push(entry as FileSystemDirectoryEntry);
              } else {
                const file = item.getAsFile();
                if (file) individualFiles.push(file);
              }
            }

            // Process each directory
            for (const dirEntry of directories) {
              const dirFiles = await collectFilesFromDirectory(dirEntry);
              const folderName = dirEntry.name;
              
              // Create upload entry for tracking (in creating-zip state)
              const totalSize = dirFiles.reduce((sum, entry) => sum + entry.file.size, 0);
              const uploadId = addUpload({ name: `${folderName}.zip`, size: totalSize, isFolder: true }, id);
              
              try {
                // Create zip file with progress tracking
                const progressCallback = (progress: number) => {
                  updateUploadProgress(uploadId, progress);
                  if (progress === 100) {
                    setUploadStatus(uploadId, 'uploading');
                  }
                };

                // Add root folder to each file's path and prepare for zip
                const filesWithRootFolder = dirFiles.map(entry => ({
                  file: entry.file,
                  path: `${folderName}/${entry.path}`
                }));

                const zipFile = await createZipFromFiles(filesWithRootFolder, folderName, progressCallback);

                // Upload the zip file
                await uploadFiles.mutateAsync({
                  files: [zipFile],
                  folderData: { folderId: id },
                  onProgress: (progress) => {
                    updateUploadProgress(uploadId, progress);
                  },
                  uploadId
                });

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

            // Handle individual files
            for (const file of individualFiles) {
              const uploadId = addUpload(file, id);
              await handleFileUpload(file, uploadId);
            }
          } else {
            // Handle files from items when no directories are present
            for (const item of Array.from(e.dataTransfer.items)) {
              if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) {
                  const uploadId = addUpload(file, id);
                  await handleFileUpload(file, uploadId);
                }
              }
            }
          }
        } else if (e.dataTransfer.files?.length > 0) {
          // Fallback for browsers without DataTransferItemList support
          for (const file of Array.from(e.dataTransfer.files)) {
            const uploadId = addUpload(file, id);
            await handleFileUpload(file, uploadId);
          }
        }
      },
      [id, name, owner, color, addItem, addUpload, updateUploadProgress, setUploadStatus, uploadFiles]
    );

    // Helper function to handle individual file uploads
    const handleFileUpload = async (file: File, uploadId: string) => {
      try {
        await uploadFiles.mutateAsync({
          files: [file],
          folderData: { folderId: id },
          onProgress: (progress) => {
            updateUploadProgress(uploadId, progress);
          },
          uploadId
        });

        setUploadStatus(uploadId, 'success');

        // Create file system item after successful upload
        const newFile: DocumentItem = {
          id: `doc-${nanoid(6)}`,
          type: file.type || "application/octet-stream",
          cardType: "document",
          name: file.name,
          owner: owner,
          folder: {
            id: id,
            name: name,
            type: "folder",
            cardType: "folder",
            owner: owner,
            color: color || "default",
            parent: null,
            items: 0,
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as FolderItem,
          extension: file.name.split(".").pop()?.toLowerCase() || "",
          size: file.size,
          isPinned: false,
          storageKey: `file-${nanoid()}.${file.name.split(".").pop()?.toLowerCase() || ""}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        addItem(newFile);
        toast.success(`Successfully uploaded file "${file.name}"`);
      } catch (error) {
        console.error('File upload failed:', error);
        
        if (error instanceof Error && error.message === 'Upload cancelled') {
          return;
        }
        
        const errorInfo = getDetailedErrorInfo(error);
        toast.error(errorInfo.message);
        setUploadStatus(uploadId, 'error');
      }
    };

    // Combine drag listeners with click handler
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
    };

    return (
      <div
        className={cn("transition-all duration-500 relative")}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={-1}
      >
        <FolderDocumentCard
          item={item}
          variant={variant}
          alternateBg={alternateBg}
          onOpen={onOpen}
          className={cn(
            className,
            isDraggingOver &&
              "opacity-30 grayscale blur-[0.3px] pointer-events-none"
          )}
        />

        {/* Drop overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary/10 pointer-events-none z-50 border-2 border-primary border-dashed flex items-center justify-end rounded-md"/>
        )}
      </div>
    );
  }
);

DraggableFolderCard.displayName = "DraggableFolderCard";
