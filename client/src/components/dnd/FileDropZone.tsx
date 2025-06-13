import { useUploadFiles } from "@/api/file/file.query";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { useUploadStore } from "@/stores/useUploadStore";
import { DocumentItem } from "@/types/folderDocumnet";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { logger } from "@/utils/logger";
import {
  collectFilesFromDirectory,
  createZipFromFiles,
} from "@/utils/uploadUtils";
import { useMatches, useParams } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

interface FileDropZoneProps {
  children: React.ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const params = useParams({ strict: false });
  const matches = useMatches();
  const addItem = useFileSystemStore((state) => state.addItem);
  const isFolderReadOnly = useFileSystemStore(
    (state) => state.isFolderReadOnly
  );
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const uploadFiles = useUploadFiles();

  const isInTrashContext = matches.some((match) =>
    match.routeId.includes("/(user)/trash")
  );
  const isInRecentContext = matches.some((match) =>
    match.routeId.includes("/(user)/recent")
  );
  const isInSearchContext = matches.some((match) =>
    match.routeId.includes("/(user)/search")
  );

  const getCurrentFolderId = () => params.id || null;
  const currentFolderId = getCurrentFolderId();

  const isReadOnlyContext = currentFolderId
    ? isFolderReadOnly(currentFolderId)
    : false || isInTrashContext || isInRecentContext || isInSearchContext;

  const getCurrentFolderName = () => {
    const folderId = getCurrentFolderId();
    if (!folderId) return "Root";
    const items = useFileSystemStore.getState().items;
    return items[folderId]?.name || "Unknown Folder";
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.types.includes("Files") && !isReadOnlyContext) {
        setIsDraggingOver(true);
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [isReadOnlyContext]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const uploadToServer = async (
    files: File[],
    uploadId: string,
    parentId: string | null = null
  ) => {
    try {
      await uploadFiles.mutateAsync({
        files,
        folderData: parentId ? { folderId: parentId } : undefined,
        onProgress: (progress) => updateUploadProgress(uploadId, progress),
        uploadId,
      });
      setUploadStatus(uploadId, "success");
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === "Upload cancelled")
        return false;
      const errorInfo = getDetailedErrorInfo(error);
      toast.error(errorInfo.message);
      errorInfo.details
        ?.slice(1)
        .forEach((detail) => toast.error(detail, { duration: 5000 }));
      setUploadStatus(uploadId, "error");
      return false;
    }
  };

  const processDroppedDirectory = async (
    items: DataTransferItemList,
    parentId: string | null
  ) => {
    const directories: FileSystemDirectoryEntry[] = [];
    const files: File[] = [];

    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
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

    for (const dirEntry of directories) {
      const dirFiles = await collectFilesFromDirectory(dirEntry);
      if (dirFiles.length === 0) {
        logger.info(`Skipping empty folder: ${dirEntry.name}`);
        continue;
      }

      const folderName = dirEntry.name;
      const totalSize = dirFiles.reduce(
        (sum, entry) => sum + entry.file.size,
        0
      );
      const uploadId = addUpload(
        { name: `${folderName}.zip`, size: totalSize, isFolder: true },
        parentId
      );

      try {
        const filesWithRoot = dirFiles.map((entry) => ({
          file: entry.file,
          path: `${folderName}/${entry.path}`,
        }));

        const progressCallback = (progress: number) => {
          updateUploadProgress(uploadId, progress);
          if (progress === 100) setUploadStatus(uploadId, "uploading");
        };

        const zipFile = await createZipFromFiles(
          filesWithRoot,
          folderName,
          progressCallback
        );

        if (zipFile.size === 0) {
          setUploadStatus(uploadId, "error");
          toast.error(`Skipped empty folder "${folderName}"`);
          continue;
        }

        await uploadFiles.mutateAsync({
          files: [zipFile],
          folderData: parentId ? { folderId: parentId } : undefined,
          onProgress: (progress) => updateUploadProgress(uploadId, progress),
          uploadId,
        });

        setUploadStatus(uploadId, "success");
        toast.success(`Uploaded folder "${folderName}"`);
      } catch (error) {
        if (error instanceof Error && error.message === "Upload cancelled")
          continue;
        const errorInfo = getDetailedErrorInfo(error);
        setUploadStatus(uploadId, "error");
        toast.error(errorInfo.message);
      }
    }

    for (const file of files) {
      const uploadId = addUpload(file, parentId);
      await uploadToServer([file], uploadId, parentId);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (isReadOnlyContext) {
        toast.error("Cannot upload files in this view");
        return;
      }

      const targetFolderId = getCurrentFolderId();

      if (e.dataTransfer.items) {
        const hasDirectories = Array.from(e.dataTransfer.items).some(
          (item) => item.webkitGetAsEntry()?.isDirectory
        );

        if (hasDirectories) {
          await processDroppedDirectory(e.dataTransfer.items, targetFolderId);
        }

        const files: File[] = [];
        for (const item of Array.from(e.dataTransfer.items)) {
          if (item.kind !== "file") continue;
          const entry = item.webkitGetAsEntry();
          if (!entry || entry.isDirectory) continue;
          const file = item.getAsFile();
          if (file) files.push(file);
        }

        for (const file of files) {
          const uploadId = addUpload(file, targetFolderId);
          const success = await uploadToServer(
            [file],
            uploadId,
            targetFolderId
          );

          if (success) {
            const newFile: DocumentItem = {
              id: `doc-${nanoid(6)}`,
              type: file.type || "application/octet-stream",
              cardType: "document",
              name: file.name,
              owner: "user-1",
              folder: targetFolderId
                ? {
                    id: targetFolderId,
                    name: getCurrentFolderName(),
                    type: "folder",
                    owner: "user-1",
                    color: "blue",
                    parent: null,
                    items: 0,
                    isPinned: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                  }
                : null,
              extension: file.name.split(".").pop()?.toLowerCase() || "",
              size: file.size,
              isPinned: false,
              storageKey: `file-${nanoid()}.${file.name.split(".").pop()?.toLowerCase() || ""}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            };
            addItem(newFile);
          }
        }
      } else if (e.dataTransfer.files?.length > 0) {
        for (const file of Array.from(e.dataTransfer.files)) {
          const uploadId = addUpload(file, targetFolderId);
          const success = await uploadToServer(
            [file],
            uploadId,
            targetFolderId
          );
          if (success) {
            const newFile: DocumentItem = {
              id: `doc-${nanoid(6)}`,
              type: file.type || "application/octet-stream",
              cardType: "document",
              name: file.name,
              owner: "user-1",
              folder: targetFolderId
                ? {
                    id: targetFolderId,
                    name: getCurrentFolderName(),
                    type: "folder",
                    owner: "user-1",
                    color: "blue",
                    parent: null,
                    items: 0,
                    isPinned: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                  }
                : null,
              extension: file.name.split(".").pop()?.toLowerCase() || "",
              size: file.size,
              isPinned: false,
              storageKey: `file-${nanoid()}.${file.name.split(".").pop()?.toLowerCase() || ""}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            };
            addItem(newFile);
          }
        }
      }
    },
    [addItem, addUpload, getCurrentFolderId, getCurrentFolderName, uploadFiles]
  );

  return (
    <div
      className="relative flex-1 flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none z-50 border-2 border-primary border-dashed flex items-center justify-end rounded-md" />
      )}
    </div>
  );
}
