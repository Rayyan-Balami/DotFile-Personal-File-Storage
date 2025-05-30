import { useUploadFiles } from "@/api/file/file.query";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { useUploadStore } from "@/stores/useUploadStore";
import { DocumentItem, FileSystemItem, FolderItem } from "@/types/folderDocumnet";
import { useMatches } from "@tanstack/react-router";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { collectFilesFromDirectory, createZipFromFiles } from "@/utils/uploadUtils";
import { nanoid } from "nanoid";
import React, { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import FolderDocumentCard, { CardVariant } from "./FolderDocumentCard";
import { useDraggable, useDroppable } from "@dnd-kit/core";

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
    const matches = useMatches();

    const isInTrashContext = matches.some(match => match.routeId.includes('/(user)/trash'));
    const isInRecentContext = matches.some(match => match.routeId.includes('/(user)/recent'));
    const isReadOnlyContext = isInTrashContext || isInRecentContext;

    // Set up draggable functionality
    const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
      id: id,
      data: {
        type: item.cardType,
        item: item,
        variant: variant
      }
    });

    // Set up droppable functionality for folders
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
      id: id,
      data: {
        type: item.cardType,
        item: item
      },
      disabled: item.cardType !== 'folder' || isReadOnlyContext
    });

    // Combine the refs
    const setRefs = useCallback((element: HTMLDivElement | null) => {
      setDraggableRef(element);
      setDroppableRef(element);
    }, [setDraggableRef, setDroppableRef]);

    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only allow drops on folder cards
      if (item.cardType !== 'folder') {
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      if (isReadOnlyContext) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      // Don't allow drops on deleted items or items with deleted ancestors
      if (item.deletedAt !== null || item.hasDeletedAncestor === true) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      // Handle OS file drops
      if (e.dataTransfer.types.includes('Files')) {
        setIsDraggingOver(true);
        e.dataTransfer.dropEffect = 'copy';
        return;
      }

      // Handle internal drag and drop
      const draggedIds = e.dataTransfer.getData('text/plain');
      if (draggedIds) {
        setIsDraggingOver(true);
        e.dataTransfer.dropEffect = 'move';
      }
    }, [isReadOnlyContext, item.cardType]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      // Don't allow drops in read-only contexts
      if (isReadOnlyContext) {
        toast.error("Cannot modify files in this view");
        return;
      }

      // Don't allow drops on non-folder items
      if (item.cardType !== 'folder') {
        return;
      }

      // Don't allow drops on deleted items or items with deleted ancestors
      if (item.deletedAt !== null || item.hasDeletedAncestor === true) {
        toast.error("Cannot upload files to a deleted folder");
        return;
      }

      const items = Array.from(e.dataTransfer.items || []);
      const directories: FileSystemDirectoryEntry[] = [];
      const individualFiles: File[] = [];

      for (const item of items) {
        if (item.kind !== "file") continue;
        const entry = item.webkitGetAsEntry();
        if (!entry) continue;
        if (entry.isDirectory) directories.push(entry as FileSystemDirectoryEntry);
        else {
          const file = item.getAsFile();
          if (file) individualFiles.push(file);
        }
      }

      for (const dirEntry of directories) {
        const dirFiles = await collectFilesFromDirectory(dirEntry);
        if (dirFiles.length === 0) continue;

        const folderName = dirEntry.name;
        const totalSize = dirFiles.reduce((sum, entry) => sum + entry.file.size, 0);
        const uploadId = addUpload({ name: `${folderName}.zip`, size: totalSize, isFolder: true }, id);

        try {
          const progressCallback = (progress: number) => {
            updateUploadProgress(uploadId, progress);
            if (progress === 100) setUploadStatus(uploadId, 'uploading');
          };

          const filesWithRootFolder = dirFiles.map(entry => ({
            file: entry.file,
            path: `${folderName}/${entry.path}`
          }));

          const zipFile = await createZipFromFiles(filesWithRootFolder, folderName, progressCallback);

          await uploadFiles.mutateAsync({
            files: [zipFile],
            folderData: { folderId: id },
            onProgress: progress => updateUploadProgress(uploadId, progress),
            uploadId
          });

          setUploadStatus(uploadId, 'success');
          toast.success(`Successfully uploaded folder "${folderName}"`);
        } catch (error) {
          if (error instanceof Error && error.message === 'Upload cancelled') continue;
          console.error('Folder upload failed:', error);
          toast.error(getDetailedErrorInfo(error).message);
          setUploadStatus(uploadId, 'error');
        }
      }

      for (const file of individualFiles) {
        const uploadId = addUpload(file, id);
        await handleFileUpload(file, uploadId);
      }

      if (!items.length && e.dataTransfer.files?.length > 0) {
        for (const file of Array.from(e.dataTransfer.files)) {
          const uploadId = addUpload(file, id);
          await handleFileUpload(file, uploadId);
        }
      }
    }, [id, name, owner, color, addItem, addUpload, updateUploadProgress, setUploadStatus, uploadFiles]);

    const handleFileUpload = async (file: File, uploadId: string) => {
      try {
        await uploadFiles.mutateAsync({
          files: [file],
          folderData: { folderId: id },
          onProgress: progress => updateUploadProgress(uploadId, progress),
          uploadId
        });

        setUploadStatus(uploadId, 'success');

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
        if (error instanceof Error && error.message === 'Upload cancelled') return;
        console.error('File upload failed:', error);
        toast.error(getDetailedErrorInfo(error).message);
        setUploadStatus(uploadId, 'error');
      }
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
    };

    return (
      <div
        ref={setRefs}
        className={cn("transition-all duration-500 relative", 
          isDragging && "opacity-30 grayscale blur-[0.3px]"
        )}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...listeners}
        {...attributes}
        tabIndex={-1}
      >
        <FolderDocumentCard
          item={item}
          variant={variant}
          alternateBg={alternateBg}
          onOpen={onOpen}
          className={cn(
            className,
            !isDragging && (isDraggingOver || isOver) && item.cardType === 'folder' &&
              "opacity-50"
          )}
        />
        {!isDragging && (isDraggingOver || (isOver && item.cardType === 'folder')) && (
          <div className="absolute inset-0 bg-primary/10 pointer-events-none z-50 border-2 border-primary border-dashed rounded-md"/>
        )}
      </div>
    );
  }
);

DraggableFolderCard.displayName = "DraggableFolderCard";