import React from "react";
import { useDialogStore } from "@/stores/useDialogStore";
import { useUploadFiles } from "@/api/file/file.query";
import { useUploadStore } from "@/stores/useUploadStore";
import { processDirectoryInput } from "@/utils/uploadUtils";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { toast } from "sonner";
import { ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";
import { useMatches } from "@tanstack/react-router";
import { useFileSystemStore } from "@/stores/useFileSystemStore";

export const ContextMenuItems = React.memo(({ parentId }: { parentId?: string | null } = {}) => {
  const { openCreateFolderDialog, openDeleteDialog } = useDialogStore();
  const uploadFiles = useUploadFiles();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const matches = useMatches();
  const items = useFileSystemStore(state => state.items);
  const isFolderReadOnly = useFileSystemStore(state => state.isFolderReadOnly);

  const isInTrashContext = matches.some(m => m.routeId.includes('/(user)/trash'));
  const isInRecentContext = matches.some(m => m.routeId.includes('/(user)/recent'));
  const isCurrentFolderDeleted = parentId && (
    !!items[parentId]?.deletedAt || 
    !!items[parentId]?.hasDeletedAncestor
  );
  const isReadOnlyContext = (parentId && isFolderReadOnly(parentId)) || isInTrashContext || isInRecentContext || isCurrentFolderDeleted;

  const handleUpload = (files: File[], isFolder = false) => {
    if (files.length === 0) {
      toast.error(isFolder ? "No files found in the selected folder" : "No files selected");
      return;
    }

    const uploadIds = files.map(file => addUpload(isFolder ? { name: file.name, size: file.size, isFolder } : file, parentId ?? null));

    uploadFiles.mutateAsync({
      files,
      folderData: parentId ? { folderId: parentId } : undefined,
      onProgress: progress => uploadIds.forEach(id => updateUploadProgress(id, progress)),
      uploadId: uploadIds[0],
    })
    .then(() => {
      uploadIds.forEach(id => {
        updateUploadProgress(id, 100);
        setUploadStatus(id, 'success');
      });
      toast.success(`Successfully uploaded ${files.length} ${isFolder ? "folder(s)" : "file(s)"}`);
    })
    .catch(error => {
      if (!(error instanceof Error && error.message === 'Upload cancelled')) {
        const errorInfo = getDetailedErrorInfo(error);
        toast.error(errorInfo.message);
        errorInfo.details.slice(1).forEach(detail => toast.error(detail, { duration: 5000 }));
        uploadIds.forEach(id => setUploadStatus(id, 'error'));
      }
    });
  };

  const triggerFileInput = (folderMode = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    if (folderMode) input.setAttribute('webkitdirectory', '');

    input.onchange = async e => {
      const target = e.target as HTMLInputElement;
      if (!target.files) return;
      if (folderMode) {
        const zipFiles = await processDirectoryInput(target);
        handleUpload(zipFiles, true);
      } else {
        handleUpload(Array.from(target.files));
      }
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  };

  const handleAction = (action: string) => {
    switch(action) {
      case "createFolder":
        openCreateFolderDialog(parentId);
        break;
      case "emptyTrash":
        openDeleteDialog("empty-trash", "folder", "all items in trash", new Date().toISOString(), true);
        break;
      case "selectAll":
        console.log("Select all action");
        break;
      case "refresh":
        window.location.reload();
        break;
      case "uploadFile":
        triggerFileInput(false);
        break;
      case "uploadFolder":
        triggerFileInput(true);
        break;
    }
  };

  return (
    <>
      {!isReadOnlyContext && (
        <>
          <ContextMenuItem onClick={() => handleAction("createFolder")}>Create New Folder</ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction("uploadFile")}>Upload File</ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction("uploadFolder")}>Upload Folder</ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      {isInTrashContext && (
        <>
          <ContextMenuItem onClick={() => handleAction("emptyTrash")} className="text-red-600 focus:text-red-600 focus:bg-red-700/20">
            Empty Trash
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      <ContextMenuItem onClick={() => handleAction("selectAll")}>Select All</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => handleAction("refresh")}>Refresh</ContextMenuItem>
    </>
  );
});

ContextMenuItems.displayName = "ContextMenuItems";
export default ContextMenuItems;
