import React from "react";
import { useDialogStore } from "@/stores/useDialogStore";
import { useUploadFiles } from "@/api/file/file.query";
import { useUploadStore } from "@/stores/useUploadStore";
import { processDirectoryInput } from "@/utils/uploadUtils";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { toast } from "sonner";
import { ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useMatches } from "@tanstack/react-router";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { useSelectionStore } from "@/stores/useSelectionStore";

interface GlobalMenuProps {
  parentId?: string | null;
}

const useGlobalMenuActions = ({ parentId }: { parentId?: string | null }) => {
  const { openCreateFolderDialog, openDeleteDialog } = useDialogStore();
  const uploadFiles = useUploadFiles();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const matches = useMatches();
  const items = useFileSystemStore(state => state.items);
  const isFolderReadOnly = useFileSystemStore(state => state.isFolderReadOnly);
  const selectAll = useSelectionStore(state => state.selectAll);

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

  return {
    isReadOnlyContext,
    isInTrashContext,
    handleAction: (action: string) => {
      switch(action) {
        case "createFolder":
          openCreateFolderDialog(parentId);
          break;
        case "emptyTrash":
          openDeleteDialog("empty-trash", "folder", "all items in trash", new Date().toISOString(), true);
          break;
        case "selectAll":
          selectAll();
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
    }
  };
};

const MenuItems = React.memo(
  ({
    props,
    itemComponent: Item,
    separatorComponent: Separator,
  }: {
    props: GlobalMenuProps;
    itemComponent: typeof ContextMenuItem | typeof DropdownMenuItem;
    separatorComponent:
      | typeof ContextMenuSeparator
      | typeof DropdownMenuSeparator;
  }) => {
    const { parentId } = props;
    const { isReadOnlyContext, isInTrashContext, handleAction } = useGlobalMenuActions({ parentId });

    return (
      <>
        {!isReadOnlyContext && (
          <>
            <Item onClick={() => handleAction("createFolder")}>New Folder</Item>
            <Item onClick={() => handleAction("uploadFile")}>Upload File</Item>
            <Item onClick={() => handleAction("uploadFolder")}>Upload Folder</Item>
            <Separator />
          </>
        )}

        {isInTrashContext && (
          <>
            <Item onClick={() => handleAction("emptyTrash")} className="text-red-600 focus:text-red-600 focus:bg-red-700/20">
              Empty Trash
            </Item>
            <Separator />
          </>
        )}

        <Item onClick={() => handleAction("selectAll")}>Select All</Item>
        <Separator />
        <Item onClick={() => handleAction("refresh")}>Refresh</Item>
      </>
    );
  }
);

export const ContextMenuItems = React.memo((props: GlobalMenuProps = {}) => (
  <MenuItems
    props={props}
    itemComponent={ContextMenuItem}
    separatorComponent={ContextMenuSeparator}
  />
));

export const DropdownMenuItems = React.memo((props: GlobalMenuProps = {}) => (
  <MenuItems
    props={props}
    itemComponent={DropdownMenuItem}
    separatorComponent={DropdownMenuSeparator}
  />
));

// Global Dropdown Menu Component (similar to FolderDocumentMenuItems pattern)

interface GlobalDropdownMenuProps extends GlobalMenuProps {
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

export const GlobalDropdownMenu = React.memo(({ 
  trigger, 
  align = "end", 
  sideOffset = 8, 
  className = "w-48",
  ...props 
}: GlobalDropdownMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      {trigger}
    </DropdownMenuTrigger>
    <DropdownMenuContent 
      align={align}
      className={className}
      sideOffset={sideOffset}
    >
      <DropdownMenuItems {...props} />
    </DropdownMenuContent>
  </DropdownMenu>
));

ContextMenuItems.displayName = "ContextMenuItems";
DropdownMenuItems.displayName = "DropdownMenuItems";
GlobalDropdownMenu.displayName = "GlobalDropdownMenu";

export default ContextMenuItems;
