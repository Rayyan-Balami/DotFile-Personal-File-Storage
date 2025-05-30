import React from "react";
import { ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { useDialogStore } from "@/stores/useDialogStore";
import { useRestoreFolder, useUpdateFolder } from "@/api/folder/folder.query";
import {
  useRestoreFile,
  useUpdateFile,
  useUploadFiles,
} from "@/api/file/file.query";
import { useUploadStore } from "@/stores/useUploadStore";
import { processDirectoryInput } from "@/utils/uploadUtils";
import { getDetailedErrorInfo, getErrorMessage } from "@/utils/apiErrorHandler";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface MenuProps {
  cardType: "folder" | "document";
  title: string;
  id: string;
  isPinned?: boolean;
  deletedAt?: string | null;
  hasDeletedAncestor?: boolean;
}

const useMenuActions = ({
  cardType,
  title,
  id,
}: Pick<MenuProps, "cardType" | "title" | "id">) => {
  const { openCreateFolderDialog, openRenameDialog, openDeleteDialog } =
    useDialogStore();
  const queryClient = useQueryClient();
  const restoreFolder = useRestoreFolder();
  const restoreFile = useRestoreFile();
  const updateFolder = useUpdateFolder();
  const updateFile = useUpdateFile();
  const uploadFiles = useUploadFiles();
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
      delete: () => openDeleteDialog(id, cardType, title),
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
      open: () =>
        navigate({ to: `/${cardType === "folder" ? "folder" : "file"}/${id}` }),
      "open-new-tab": () => {
        window.open(
          `/${cardType === "folder" ? "folder" : "file"}/${id}`,
          "_blank"
        );
      },
      info: () => {
        toast.info("Info dialog coming soon");
      },
      download: () => {
        console.log("Download action");
      },
      preview: () => {
        console.log("Preview action");
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
    } = props;
    const handleAction = useMenuActions({ cardType, title, id });
    const isDeleted = deletedAt || hasDeletedAncestor;

    if (isDeleted) {
      return (
        <>
          <Item onClick={() => handleAction("open")}>Open</Item>
          <Item onClick={() => handleAction("open-new-tab")}>
            Open in new tab
          </Item>
          <Separator />
          <Item
            onClick={() => handleAction("info")}
            className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20"
          >
            More Info
          </Item>
          <Separator />
          {deletedAt && !hasDeletedAncestor && (
            <>
              <Item
                onClick={() => handleAction("restore")}
                className="text-green-600 focus:text-green-600 focus:bg-green-700/20"
              >
                Put back
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
        <Item onClick={() => handleAction("open-new-tab")}>
          Open in new tab
        </Item>
        <Item onClick={() => handleAction("rename")}>Rename</Item>
        <Separator />
        <Item onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
          {isPinned ? "Unpin" : "Pin"}
        </Item>
        <Separator />
        <Item
          onClick={() => handleAction("info")}
          className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20"
        >
          More Info
        </Item>
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
          <Item onClick={() => handleAction("create-folder")}>
            Create new folder
          </Item>
          <Item onClick={() => handleAction("upload-file")}>Upload file</Item>
          <Item onClick={() => handleAction("upload-folder")}>
            Upload folder
          </Item>
          <Separator />
          {commonItems}
        </>
      );
    }

    return (
      <>
        <Item onClick={() => handleAction("download")}>Download</Item>
        <Item onClick={() => handleAction("preview")}>Preview</Item>
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
