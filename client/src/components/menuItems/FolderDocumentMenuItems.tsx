import {
  useRestoreFile,
  useUpdateFile,
  useUploadFiles,
  useDownloadFile,
} from "@/api/file/file.query";
import { useRestoreFolder, useUpdateFolder } from "@/api/folder/folder.query";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogStore } from "@/stores/useDialogStore";
import { useUploadStore } from "@/stores/useUploadStore";
import { getDetailedErrorInfo, getErrorMessage } from "@/utils/apiErrorHandler";
import { processDirectoryInput } from "@/utils/uploadUtils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import React from "react";
import { toast } from "sonner";

// Utility function to format timestamps consistently
const formatTimestamp = (timestamp?: string | Date | null): string => {
  if (!timestamp) return "Unknown";
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) return "Invalid date";
  
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Timestamps submenu component that works with both dropdown and context menus
const TimestampsSubmenu = React.memo(({
  createdAt,
  updatedAt,
  deletedAt,
  itemComponent: Item,
  subComponent: Sub,
  subTriggerComponent: SubTrigger,
  subContentComponent: SubContent,
}: {
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
  itemComponent: typeof ContextMenuItem | typeof DropdownMenuItem;
  subComponent: typeof ContextMenuSub | typeof DropdownMenuSub;
  subTriggerComponent: typeof ContextMenuSubTrigger | typeof DropdownMenuSubTrigger;
  subContentComponent: typeof ContextMenuSubContent | typeof DropdownMenuSubContent;
}) => (
  <Sub>
    <SubTrigger className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20">
      Timestamps
    </SubTrigger>
    <SubContent>
      <Item disabled>
        <div className="flex flex-col gap-1 py-1">
          <div className="text-xs font-medium text-muted-foreground">Created</div>
          <div className="text-sm">{formatTimestamp(createdAt)}</div>
        </div>
      </Item>
      <Item disabled>
        <div className="flex flex-col gap-1 py-1">
          <div className="text-xs font-medium text-muted-foreground">Modified</div>
          <div className="text-sm">{formatTimestamp(updatedAt)}</div>
        </div>
      </Item>
      {deletedAt && (
        <Item disabled>
          <div className="flex flex-col gap-1 py-1">
            <div className="text-xs font-medium text-muted-foreground">Deleted</div>
            <div className="text-sm">{formatTimestamp(deletedAt)}</div>
          </div>
        </Item>
      )}
    </SubContent>
  </Sub>
));

interface MenuProps {
  cardType: "folder" | "document";
  title: string;
  id: string;
  isPinned?: boolean;
  deletedAt?: string | null;
  hasDeletedAncestor?: boolean;
  color?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const useMenuActions = ({
  cardType,
  title,
  id,
  deletedAt,
  hasDeletedAncestor,
  color,
}: Pick<MenuProps, "cardType" | "title" | "id" | "deletedAt" | "hasDeletedAncestor" | "color">
) => {
  const {
    openCreateFolderDialog,
    openRenameDialog,
    openDeleteDialog,
    openFolderColorDialog,
    openFilePreviewDialog,
  } = useDialogStore();
  const queryClient = useQueryClient();
  const restoreFolder = useRestoreFolder();
  const restoreFile = useRestoreFile();
  const updateFolder = useUpdateFolder();
  const updateFile = useUpdateFile();
  const uploadFiles = useUploadFiles();
  const downloadFile = useDownloadFile();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const navigate = useNavigate();

  const handleFileUpload = async (files: FileList | null, isFolder = false) => {
    if (!files || files.length === 0) {
      toast.error(
        isFolder ? "No files found in the selected folder" : "No files selected"
      );
      return;
    }

    const fileArray = Array.from(files);
    let uploadIds: string[] = [];

    try {
      if (isFolder) {
        // Group files by their root directory
        const folderMap = new Map<string, File[]>();
        fileArray.forEach((file) => {
          const [rootFolder] = file.webkitRelativePath.split("/");
          if (!folderMap.has(rootFolder)) {
            folderMap.set(rootFolder, []);
          }
          folderMap.get(rootFolder)!.push(file);
        });

        // Create upload entries and process directories
        uploadIds = Array.from(folderMap.keys()).map((folderName) => {
          const totalSize = folderMap
            .get(folderName)!
            .reduce((sum, file) => sum + file.size, 0);
          return addUpload(
            { name: `${folderName}.zip`, size: totalSize, isFolder: true },
            id
          );
        });

        // Create dummy input element to satisfy processDirectoryInput type
        const dummyInput = { files } as HTMLInputElement;
        const zipFiles = await processDirectoryInput(
          dummyInput,
          (folderName: string, progress: number) => {
            const uploadIndex = Array.from(folderMap.keys()).indexOf(
              folderName
            );
            if (uploadIndex >= 0) {
              updateUploadProgress(uploadIds[uploadIndex], progress);
              if (progress === 100)
                setUploadStatus(uploadIds[uploadIndex], "uploading");
            }
          }
        );

        if (zipFiles.length === 0) {
          uploadIds.forEach((uploadId) => setUploadStatus(uploadId, "error"));
          return;
        }

        await uploadFiles.mutateAsync({
          files: zipFiles,
          folderData: { folderId: id },
          onProgress: (progress) =>
            uploadIds.forEach((id) => updateUploadProgress(id, progress)),
          uploadId: uploadIds[0],
        });
      } else {
        // Handle regular file upload
        uploadIds = fileArray.map((file) => addUpload(file, id));
        await uploadFiles.mutateAsync({
          files: fileArray,
          folderData: { folderId: id },
          onProgress: (progress) =>
            uploadIds.forEach((id) => updateUploadProgress(id, progress)),
          uploadId: uploadIds[0],
        });
      }

      uploadIds.forEach((id) => setUploadStatus(id, "success"));
      toast.success(
        `Successfully uploaded ${isFolder ? "folder(s)" : "file(s)"} to ${title}`
      );
    } catch (error) {
      if (!(error instanceof Error && error.message === "Upload cancelled")) {
        const errorInfo = getDetailedErrorInfo(error);
        toast.error(errorInfo.message);
        errorInfo.details
          .slice(1)
          .forEach((detail) => toast.error(detail, { duration: 5000 }));
        uploadIds.forEach((id) => setUploadStatus(id, "error"));
      }
    }
  };

  const triggerFileInput = (isFolder = false) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    if (isFolder) {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      input.setAttribute("mozdirectory", "");
      input.setAttribute("msdirectory", "");
    }

    input.onchange = (e) => {
      handleFileUpload((e.target as HTMLInputElement).files, isFolder);
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  };

  const handlePin = async (pin: boolean) => {
    try {
      if (cardType === "folder") {
        await updateFolder.mutateAsync({
          folderId: id,
          data: { isPinned: pin },
        });
      } else {
        await updateFile.mutateAsync({
          fileId: id,
          data: { isPinned: pin },
        });
      }
      toast.success(`${title} ${pin ? "pinned" : "unpinned"} successfully`);
    } catch (error) {
      console.error(`${pin ? "Pin" : "Unpin"} error:`, error);
      toast.error(getErrorMessage(error));
    }
  };

  return (action: string) => {
    const actions: Record<string, () => void | Promise<void>> = {
      "create-folder": () => {
        if (cardType === "folder") openCreateFolderDialog(id);
      },
      rename: () => openRenameDialog(id, cardType, title),
      delete: () =>
        openDeleteDialog(id, cardType, title, deletedAt, hasDeletedAncestor),
      restore: async () => {
        const mutation = cardType === "folder" ? restoreFolder : restoreFile;
        await mutation.mutateAsync(id, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["folders", "trash"] });
            queryClient.invalidateQueries({
              queryKey: [cardType === "folder" ? "folders" : "files"],
            });
          },
        });
      },
      pin: () => handlePin(true),
      unpin: () => handlePin(false),
      color: () => {
        if (cardType === "folder") openFolderColorDialog(id, title, color);
      },
      open: () => {
        if (cardType === "folder") {
          // Navigate to the folder
          navigate({ to: `/folder/${id}` });
        } else {
          // For documents, we need to open the file preview dialog
          // Since we don't have access to all documents in the current context,
          // we'll create a single-item preview
          const documentItem = {
            id,
            name: title,
            type: 'application/octet-stream', // We don't have the actual type here
            extension: '', // We don't have the actual extension here
            cardType: 'document' as const
          };
          openFilePreviewDialog([documentItem], 0);
        }
      },
      "open-new-tab": () => {
        if (cardType === "folder") {
          // Open folder in new tab
          window.open(`/folder/${id}`, "_blank", "noopener,noreferrer");
        }
        // No action for documents since we can't open preview dialog in new tab
      },
      download: async () => {
        if (cardType === "document") {
          try {
            const result = await downloadFile.mutateAsync({ fileId: id, fallbackFilename: title });
            toast.success(`Downloaded "${result.filename}"`);
          } catch (error) {
            toast.error("Failed to download file");
          }
        }
      },
      "upload-file": () => triggerFileInput(false),
      "upload-folder": () => triggerFileInput(true),
    };

    const actionFn = actions[action];
    if (actionFn) return actionFn();
  };
};

const MenuItems = React.memo(
  ({
    props,
    itemComponent: Item,
    separatorComponent: Separator,
  }: {
    props: MenuProps;
    itemComponent: typeof ContextMenuItem | typeof DropdownMenuItem;
    separatorComponent:
      | typeof ContextMenuSeparator
      | typeof DropdownMenuSeparator;
  }) => {
    const {
      cardType,
      title,
      id,
      isPinned = false,
      deletedAt = null,
      hasDeletedAncestor = false,
      color = "default",
      createdAt,
      updatedAt,
    } = props;
    const handleAction = useMenuActions({
      cardType,
      title,
      id,
      deletedAt,
      hasDeletedAncestor,
      color,
    });
    const isDeleted = deletedAt || hasDeletedAncestor;

    if (isDeleted) {
      return (
        <>
          <Item onClick={() => handleAction("open")}>Open</Item>
          {cardType === "folder" && (
            <Item onClick={() => handleAction("open-new-tab")}>
              Open in New Tab
            </Item>
          )}
          <Separator />
          <TimestampsSubmenu
            createdAt={createdAt}
            updatedAt={updatedAt}
            deletedAt={deletedAt}
            itemComponent={Item}
            subComponent={Item === ContextMenuItem ? ContextMenuSub : DropdownMenuSub}
            subTriggerComponent={Item === ContextMenuItem ? ContextMenuSubTrigger : DropdownMenuSubTrigger}
            subContentComponent={Item === ContextMenuItem ? ContextMenuSubContent : DropdownMenuSubContent}
          />
          <Separator />
          {deletedAt && !hasDeletedAncestor && (
            <>
              <Item
                onClick={() => handleAction("restore")}
                className="text-green-600 focus:text-green-600 focus:bg-green-700/20"
              >
                Put Back
              </Item>
              <Separator />
            </>
          )}
          <Item
            onClick={() => handleAction("delete")}
            className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
          >
            Delete Permanently
          </Item>
        </>
      );
    }

    const commonItems = (
      <>
        <Item onClick={() => handleAction("open")}>Open</Item>
        {cardType === "folder" && (
          <Item onClick={() => handleAction("open-new-tab")}>
            Open in New Tab
          </Item>
        )}
        <Item onClick={() => handleAction("rename")}>Rename</Item>
        <Separator />
        <Item onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
          {isPinned ? "Unpin" : "Pin"}
        </Item>
        {cardType === "folder" && (
          <Item onClick={() => handleAction("color")}>Color</Item>
        )}
        <Separator />
        <TimestampsSubmenu
          createdAt={createdAt}
          updatedAt={updatedAt}
          deletedAt={deletedAt}
          itemComponent={Item}
          subComponent={Item === ContextMenuItem ? ContextMenuSub : DropdownMenuSub}
          subTriggerComponent={Item === ContextMenuItem ? ContextMenuSubTrigger : DropdownMenuSubTrigger}
          subContentComponent={Item === ContextMenuItem ? ContextMenuSubContent : DropdownMenuSubContent}
        />
        <Separator />
        <Item
          onClick={() => handleAction("delete")}
          className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
        >
          Move to Trash
        </Item>
      </>
    );

    if (cardType === "folder") {
      return (
        <>
          <Item onClick={() => handleAction("create-folder")}>New Folder</Item>
          <Item onClick={() => handleAction("upload-file")}>Upload File</Item>
          <Item onClick={() => handleAction("upload-folder")}>
            Upload Folder
          </Item>
          <Separator />
          {commonItems}
        </>
      );
    }

    return (
      <>
        <Item onClick={() => handleAction("download")}>Download</Item>
        <Separator />
        {commonItems}
      </>
    );
  }
);

export const ContextMenuItems = React.memo((props: MenuProps) => (
  <MenuItems
    props={props}
    itemComponent={ContextMenuItem}
    separatorComponent={ContextMenuSeparator}
  />
));

export const DropdownMenuItems = React.memo((props: MenuProps) => (
  <MenuItems
    props={props}
    itemComponent={DropdownMenuItem}
    separatorComponent={DropdownMenuSeparator}
  />
));

export { ContextMenuItems as default };
