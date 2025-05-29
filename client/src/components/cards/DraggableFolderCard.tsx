import { useFileSystemDnd } from "@/components/dnd/FileSystemDndContext";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { useUploadStore } from "@/stores/useUploadStore";
import { FileSystemItem, DocumentItem, FolderItem } from "@/types/folderDocumnet";
import { formatFileSize } from "@/utils/formatUtils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { nanoid } from "nanoid";
import React, { memo, useCallback, useState } from "react";
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
    const [isExternalFileDragOver, setIsExternalFileDragOver] = useState(false);
    const addItem = useFileSystemStore((state) => state.addItem);
    const { addUpload, setUploadStatus } = useUploadStore();
    const { id, type, cardType, name, owner } = item;

    const {
      attributes,
      listeners,
      setNodeRef: setDragNodeRef,
      isDragging,
    } = useDraggable({
      id,
      data: {
        id,
        type,
        cardType,
        name,
        variant,
        item,
      },
    });

    const { setNodeRef: setDropNodeRef } = useDroppable({
      id,
      disabled: cardType !== "folder",
    });

    const { isOver: globalIsOver } = useFileSystemDnd();

    const setNodeRef = useCallback(
      (node: HTMLElement | null) => {
        setDragNodeRef(node);
        if (cardType === "folder") {
          setDropNodeRef(node);
        }
      },
      [setDragNodeRef, setDropNodeRef, cardType]
    );

    const isDropTarget = globalIsOver === id || isExternalFileDragOver;

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (cardType !== "folder") return;

        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.stopPropagation();
          setIsExternalFileDragOver(true);
          e.dataTransfer.dropEffect = "copy";
        }
      },
      [type]
    );

    const handleDragLeave = useCallback(() => {
      setIsExternalFileDragOver(false);
    }, []);

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        if (cardType !== "folder") return;

        e.preventDefault();
        e.stopPropagation();
        setIsExternalFileDragOver(false);

        const { files, items } = e.dataTransfer;
        const folderItem = item as FolderItem;

        // Using modern DataTransferItemList API if available
        if (items) {
          console.log(`Processing ${items.length} items on folder "${name}" (ID: ${id})`);

          for (const item of Array.from(items)) {
            // Skip if not file
            if (item.kind !== "file") {
              console.log("Skipping non-file item");
              continue;
            }

            // Get WebkitEntry (for directory support)
            const entry = item.webkitGetAsEntry();
            if (!entry) {
              console.log("No entry found for item, skipping");
              continue;
            }

            if (entry.isDirectory) {
              const dirEntry = entry as FileSystemDirectoryEntry;

              // Create upload item for folder
              const uploadId = addUpload(
                {
                  name: entry.name,
                  size: 0,
                  isFolder: true,
                },
                id
              );

              // Create a new folder item
              const newFolderId = `folder-${nanoid(6)}`;
              const newFolder: FolderItem = {
                id: newFolderId,
                type: "folder",
                cardType: "folder",
                name: entry.name,
                owner: owner,
                parent: id,
                color: "blue",
                items: 0,
                isPinned: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              };

              addItem(newFolder);

              // Process directory contents
              const dirReader = dirEntry.createReader();
              const readAllEntries = async (): Promise<FileSystemEntry[]> => {
                const entries: FileSystemEntry[] = [];
                let readEntries: FileSystemEntry[] = [];

                do {
                  readEntries = await new Promise((resolve) => {
                    dirReader.readEntries((results) => {
                      resolve(Array.from(results));
                    });
                  });
                  entries.push(...readEntries);
                } while (readEntries.length > 0);

                return entries;
              };

              const entries = await readAllEntries();
              console.log(`Processing ${entries.length} entries in directory "${entry.name}"`);

              // Process all entries
              for (const childEntry of entries) {
                if (childEntry.isFile) {
                  const fileEntry = childEntry as FileSystemFileEntry;
                  await new Promise<void>((resolve) => {
                    fileEntry.file((file) => {
                      const childFileId = `doc-${nanoid(6)}`;
                      const extension = file.name.split(".").pop()?.toLowerCase() || "";

                      // Create upload item
                      const childUploadId = addUpload(file, newFolderId);

                      // Create file system item
                      const newFile: DocumentItem = {
                        id: childFileId,
                        type: file.type || "application/octet-stream",
                        cardType: "document",
                        name: file.name,
                        owner: owner,
                        folder: {
                          id: newFolderId,
                          name: entry.name,
                          type: "folder",
                          owner: owner,
                          color: "blue",
                          parent: null,
                          items: 0,
                          isPinned: false,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          deletedAt: null,
                        },
                        extension,
                        size: file.size,
                        isPinned: false,
                        storageKey: `file-${nanoid()}.${extension}`,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        deletedAt: null,
                      };

                      // Wait for upload to complete before adding file
                      const interval = setInterval(() => {
                        const upload = useUploadStore
                          .getState()
                          .uploads.find((u) => u.id === childUploadId);
                        if (upload?.status === "success" || upload?.status === "error") {
                          clearInterval(interval);
                          if (upload.status === "success") {
                            addItem(newFile);
                          }
                          resolve();
                        }
                      }, 100);
                    });
                  });
                }
              }

              // Mark folder upload as complete
              setUploadStatus(uploadId, "success");
            } else {
              const fileEntry = entry as FileSystemFileEntry;
              await new Promise<void>((resolve) => {
                fileEntry.file((file) => {
                  const newFileId = `doc-${nanoid(6)}`;
                  const extension = file.name.split(".").pop()?.toLowerCase() || "";

                  // Create upload item
                  const uploadId = addUpload(file, id);

                  // Create file system item
                  const newFile: DocumentItem = {
                    id: newFileId,
                    type: file.type || "application/octet-stream",
                    cardType: "document",
                    name: file.name,
                    owner: owner,
                    folder: {
                      id: id,
                      name: name,
                      type: "folder",
                      owner: owner,
                      color: folderItem.color,
                      parent: null,
                      items: 0,
                      isPinned: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      deletedAt: null,
                    },
                    extension,
                    size: file.size,
                    isPinned: false,
                    storageKey: `file-${nanoid()}.${extension}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                  };

                  // Wait for upload to complete before adding file
                  const interval = setInterval(() => {
                    const upload = useUploadStore.getState().uploads.find((u) => u.id === uploadId);
                    if (upload?.status === "success" || upload?.status === "error") {
                      clearInterval(interval);
                      if (upload.status === "success") {
                        addItem(newFile);
                      }
                      resolve();
                    }
                  }, 100);
                });
              });
            }
          }
        } else if (files && files.length > 0) {
          // Fallback for browsers without DataTransferItemList support
          console.log(`Processing ${files.length} files (directory support unavailable)...`);

          for (const file of Array.from(files)) {
            const newFileId = `doc-${nanoid(6)}`;
            const extension = file.name.split(".").pop()?.toLowerCase() || "";

            // Create upload item
            const uploadId = addUpload(file, id);

            // Create file system item
            const newFile: DocumentItem = {
              id: newFileId,
              type: file.type || "application/octet-stream",
              cardType: "document",
              name: file.name,
              owner: owner,
              folder: {
                id: id,
                name: name,
                type: "folder",
                owner: owner,
                color: folderItem.color,
                parent: null,
                items: 0,
                isPinned: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              },
              extension,
              size: file.size,
              isPinned: false,
              storageKey: `file-${nanoid()}.${extension}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            };

            // Wait for upload to complete before adding file
            const interval = setInterval(() => {
              const upload = useUploadStore.getState().uploads.find((u) => u.id === uploadId);
              if (upload?.status === "success" || upload?.status === "error") {
                clearInterval(interval);
                if (upload.status === "success") {
                  addItem(newFile);
                }
              }
            }, 100);

            console.log(
              `Added upload: "${file.name}" (Size: ${formatFileSize(
                file.size
              )}, Type: ${file.type}) to folder: ${name} (${id})`
            );
          }
        }

        console.log("Drop processing completed");
      },
      [id, name, cardType, addItem, owner, item, addUpload, setUploadStatus]
    );

    // Combine drag listeners with click handler
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(event);
    };

    return (
      <div
        ref={setNodeRef}
        className={cn("transition-all duration-500 relative")}
        {...attributes}
        {...listeners}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        tabIndex={-1}
      >
        <FolderDocumentCard
          item={item}
          variant={variant}
          alternateBg={alternateBg}
          onOpen={onOpen}
          className={cn(
            className,
            isDragging &&
              "opacity-30 grayscale blur-[0.3px] pointer-events-none",
            isDropTarget && "border-transparent"
          )}
        />

        {isDropTarget && (
          <div className="absolute inset-0 bg-primary/10 pointer-events-none rounded-md z-10 border-2 border-primary border-dashed flex items-center justify-center" />
        )}
      </div>
    );
  }
);

DraggableFolderCard.displayName = "DraggableFolderCard";
