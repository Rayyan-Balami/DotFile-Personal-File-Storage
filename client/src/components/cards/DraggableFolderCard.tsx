import { useFileSystemDnd } from "@/components/dnd/FileSystemDndContext";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { FileSystemItem, DocumentItem, FolderItem } from "@/types/folderDocumnet";
import { formatFileSize } from "@/utils/formatUtils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { nanoid } from "nanoid";
import React, { memo, useCallback, useState } from "react";
import FolderDocumentCard, { CardVariant } from "./FolderDocumentCard";

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
    const { id, type, name, owner } = item;

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
        name,
        variant,
        item,
      },
    });

    const { setNodeRef: setDropNodeRef } = useDroppable({
      id,
      disabled: type !== "folder",
    });

    const { isOver: globalIsOver } = useFileSystemDnd();

    const setNodeRef = useCallback(
      (node: HTMLElement | null) => {
        setDragNodeRef(node);
        if (type === "folder") {
          setDropNodeRef(node);
        }
      },
      [setDragNodeRef, setDropNodeRef, type]
    );

    const isDropTarget = globalIsOver === id || isExternalFileDragOver;

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (type !== "folder") return;

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
      (e: React.DragEvent) => {
        if (type !== "folder") return;

        e.preventDefault();
        e.stopPropagation();
        setIsExternalFileDragOver(false);

        const { files } = e.dataTransfer;
        if (files && files.length > 0) {
          const folderItem = item as FolderItem;

          console.log(`Files dropped on folder "${name}" (ID: ${id})`);
          console.log(`Total files: ${files.length}`);

          Array.from(files).forEach((file) => {
            const newFileId = `doc-${nanoid(6)}`;
            const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
            
            // Create new document with updated type structure
            const newFile: DocumentItem = {
              id: newFileId,
              type: "document",
              name: file.name,
              size: file.size,
              owner: "user-1", // This should come from auth context
              folder: {
                id,
                name,
                type: "folder",
                owner,
                color: folderItem.color,
                parent: folderItem.parent,
                items: folderItem.items,
                isPinned: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null
              },
              path: `/${file.name.toLowerCase().replace(/\s+/g, "-")}`,
              pathSegments: [],
              extension: fileExtension,
              storageKey: `file-${nanoid()}.${fileExtension}`,
              isPinned: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null
            };

            addItem(newFile);

            console.log(`File details:
              - ID: ${newFileId}
              - Name: ${file.name}
              - Type: document
              - Extension: ${fileExtension}
              - Size: ${formatFileSize(file.size)}
              - Target folder: ${name} (ID: ${id})
              - Timestamp: ${new Date().toISOString()}
            `);
          });

          console.log(
            `Drop operation completed for ${files.length} file(s) on folder "${name}"`
          );
        }
      },
      [id, name, type, addItem, item, owner]
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
