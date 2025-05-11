import { useFileSystemDnd } from "@/components/dnd/FileSystemDndContext";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { FileSystemItem } from "@/types/folderDocumnet";
import { formatFileSize } from "@/utils/formatUtils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useNavigate } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import React, { memo, useCallback, useState } from "react";
import FolderDocumentCard, { CardVariant } from "./FolderDocumentCard";

interface DraggableFolderCardProps {
  item: FileSystemItem;
  variant?: CardVariant;
  alternateBg?: boolean;
  className?: string;
  onOpen?: () => void;
}

export const DraggableFolderCard = memo(
  ({
    item,
    variant = "large",
    className,
    alternateBg = false,
    onOpen,
  }: DraggableFolderCardProps) => {
    const [isExternalFileDragOver, setIsExternalFileDragOver] = useState(false);
    const addItem = useFileSystemStore((state) => state.addItem);
    const navigate = useNavigate();

    const { id, type, name } = item;

    const {
      attributes,
      listeners,
      setNodeRef: setDragNodeRef,
      isDragging,
    } = useDraggable({
      id,
      data: {
        type,
        id,
        name,
        variant,
        item,
      },
    });

    const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
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
          console.log(`Files dropped on folder "${name}" (ID: ${id})`);
          console.log(`Total files: ${files.length}`);

          Array.from(files).forEach((file) => {
            const newFileId = `doc-${nanoid(6)}`;
            const fileExtension =
              file.name.split(".").pop()?.toLowerCase() || "";

            console.log(`File details:
          - ID (would be): ${newFileId}
          - Name: ${file.name}
          - Type: ${file.type}
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
      [id, name, type]
    );

    return (
      <div
        ref={setNodeRef}
        className={cn("transition-all duration-500 relative")}
        {...attributes}
        {...listeners}
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
            isDragging &&
              "opacity-30 grayscale blur-[0.3px] pointer-events-none",
            isDropTarget && "border-transparent"
          )}
        />

        {isDropTarget && (
          <div className="absolute inset-0 bg-primary/10 pointer-events-none rounded-md z-10 border-2 border-primary border-dashed flex items-center justify-center"></div>
        )}
      </div>
    );
  }
);

DraggableFolderCard.displayName = "DraggableFolderCard";
