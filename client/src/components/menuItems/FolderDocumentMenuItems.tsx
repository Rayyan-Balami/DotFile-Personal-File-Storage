import React from 'react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "../ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useDialogStore } from "@/stores/useDialogStore";
import { useRestoreFolder, useUpdateFolder } from '@/api/folder/folder.query';
import { useRestoreFile, useUpdateFile } from '@/api/file/file.query';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

// Context menu items component
export const ContextMenuItems = React.memo(
  ({
    cardType,
    title,
    id,
    isPinned = false,
    deletedAt = null,
    hasDeletedAncestor = false,
  }: {
    cardType: "folder" | "document";
    title: string;
    id: string;
    isPinned?: boolean;
    deletedAt?: string | null;
    hasDeletedAncestor?: boolean;
  }) => {
    const { openCreateFolderDialog, openRenameDialog, openDeleteDialog } = useDialogStore();
    const queryClient = useQueryClient();
    const restoreFolder = useRestoreFolder();
    const restoreFile = useRestoreFile();
    const updateFolder = useUpdateFolder();
    const updateFile = useUpdateFile();
    const navigate = useNavigate();
    
    const handleAction = async (action: string) => {
      console.log(`Action triggered: ${action} on ${title} (${id})`);
      
      if (action === "create-folder") {
        if (cardType === "folder") {
          openCreateFolderDialog(id);
        }
      } else if (action === "rename") {
        openRenameDialog(id, cardType, title);
      } else if (action === "delete") {
        openDeleteDialog(id, cardType, title, deletedAt, hasDeletedAncestor);
      } else if (action === "restore") {
        if (cardType === "folder") {
          restoreFolder.mutate(id, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
              queryClient.invalidateQueries({ queryKey: ['folders'] });
            }
          });
        } else {
          restoreFile.mutate(id, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
              queryClient.invalidateQueries({ queryKey: ['files'] });
            }
          });
        }
      } else if (action === "pin") {
        try {
          if (cardType === "folder") {
            await updateFolder.mutateAsync({
              folderId: id,
              data: { isPinned: true }
            });
            toast.success(`${title} pinned successfully`);
          } else {
            await updateFile.mutateAsync({
              fileId: id,
              data: { isPinned: true }
            });
            toast.success(`${title} pinned successfully`);
          }
        } catch (error) {
          toast.error(`Failed to pin ${title}`);
        }
      } else if (action === "unpin") {
        try {
          if (cardType === "folder") {
            await updateFolder.mutateAsync({
              folderId: id,
              data: { isPinned: false }
            });
            toast.success(`${title} unpinned successfully`);
          } else {
            await updateFile.mutateAsync({
              fileId: id,
              data: { isPinned: false }
            });
            toast.success(`${title} unpinned successfully`);
          }
        } catch (error) {
          toast.error(`Failed to unpin ${title}`);
        }
      } else if (action === "open") {
        if (cardType === "folder") {
          navigate({ to: `/folder/${id}` });
        } else {
          navigate({ to: `/file/${id}` });
        }
      } else if (action === "open-new-tab") {
        const url = cardType === "folder" ? `/folder/${id}` : `/file/${id}`;
        window.open(url, '_blank');
      } else if (action === "info") {
        // Implement info action
        toast.info("Info dialog coming soon");
      }
    };

    const commonItems = (
      <>
        <ContextMenuItem onClick={() => handleAction("open")}>
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("rename")}>
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
          {isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleAction("info")}
          className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20"
        >
          More Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        {deletedAt && !hasDeletedAncestor ? (
          <>
            <ContextMenuItem
              onClick={() => handleAction("restore")}
              className="text-green-600 focus:text-green-600 focus:bg-green-700/20"
            >
              Put back
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem
          onClick={() => handleAction("delete")}
          className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
        >
          {deletedAt || hasDeletedAncestor ? "Delete Permanently" : "Move to Trash"}
        </ContextMenuItem>
      </>
    );

    if (cardType === "folder") {
      return (
        <>
          <ContextMenuItem
            onClick={() => handleAction("create-folder")}
          >
            Create new folder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction("upload-file")}>
            Upload file
          </ContextMenuItem>
          <ContextMenuSeparator />
          {commonItems}
        </>
      );
    }

    return (
      <>
        <ContextMenuItem onClick={() => handleAction("download")}>
          Download
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("preview")}>
          Preview
        </ContextMenuItem>
        <ContextMenuSeparator />
        {commonItems}
      </>
    );
  }
);

// Dropdown menu items component
export const DropdownMenuItems = React.memo(
  ({
    cardType,
    title,
    id,
    isPinned = false,
    deletedAt = null,
    hasDeletedAncestor = false,
  }: {
    cardType: "folder" | "document";
    title: string;
    id: string;
    isPinned?: boolean;
    deletedAt?: string | null;
    hasDeletedAncestor?: boolean;
  }) => {
  console.log("hasDeletedAncestor" ,hasDeletedAncestor);
    const { openCreateFolderDialog, openRenameDialog, openDeleteDialog } = useDialogStore();
    const queryClient = useQueryClient();
    const restoreFolder = useRestoreFolder();
    const restoreFile = useRestoreFile();
    const updateFolder = useUpdateFolder();
    const updateFile = useUpdateFile();
    const navigate = useNavigate();
    
    const handleAction = async (action: string) => {
      console.log(`Action triggered: ${action} on ${title} (${id})`);
      
      if (action === "create-folder") {
        if (cardType === "folder") {
          openCreateFolderDialog(id);
        }
      } else if (action === "rename") {
        openRenameDialog(id, cardType, title);
      } else if (action === "delete") {
        openDeleteDialog(id, cardType, title, deletedAt, hasDeletedAncestor);
      } else if (action === "restore") {
        if (cardType === "folder") {
          restoreFolder.mutate(id, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
              queryClient.invalidateQueries({ queryKey: ['folders'] });
            }
          });
        } else {
          restoreFile.mutate(id, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
              queryClient.invalidateQueries({ queryKey: ['files'] });
            }
          });
        }
      } else if (action === "pin") {
        try {
          if (cardType === "folder") {
            await updateFolder.mutateAsync({
              folderId: id,
              data: { isPinned: true }
            });
            toast.success(`${title} pinned successfully`);
          } else {
            await updateFile.mutateAsync({
              fileId: id,
              data: { isPinned: true }
            });
            toast.success(`${title} pinned successfully`);
          }
        } catch (error) {
          toast.error(`Failed to pin ${title}`);
        }
      } else if (action === "unpin") {
        try {
          if (cardType === "folder") {
            await updateFolder.mutateAsync({
              folderId: id,
              data: { isPinned: false }
            });
            toast.success(`${title} unpinned successfully`);
          } else {
            await updateFile.mutateAsync({
              fileId: id,
              data: { isPinned: false }
            });
            toast.success(`${title} unpinned successfully`);
          }
        } catch (error) {
          toast.error(`Failed to unpin ${title}`);
        }
      } else if (action === "open") {
        if (cardType === "folder") {
          navigate({ to: `/folder/${id}` });
        } else {
          navigate({ to: `/file/${id}` });
        }
      } else if (action === "open-new-tab") {
        const url = cardType === "folder" ? `/folder/${id}` : `/file/${id}`;
        window.open(url, '_blank');
      } else if (action === "info") {
        // Implement info action
        toast.info("Info dialog coming soon");
      }
    };

    const commonItems = (
      <>
        <DropdownMenuItem onClick={() => handleAction("open")}>
          Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("rename")}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
          {isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction("info")} className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20">
          More Info
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {deletedAt && !hasDeletedAncestor ? (
          <>
            <DropdownMenuItem
              onClick={() => handleAction("restore")}
              className="text-green-600 focus:text-green-600 focus:bg-green-700/20"
            >
              Put back
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onClick={() => handleAction("delete")}
          className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
        >
          {deletedAt || hasDeletedAncestor ? "Delete Permanently" : "Move to Trash"}
        </DropdownMenuItem>
      </>
    );

    if (cardType === "folder") {
      return (
        <>
          <DropdownMenuItem onClick={() => handleAction("create-folder")}>
            Create new folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("upload-file")}>
            Upload file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {commonItems}
        </>
      );
    }

    return (
      <>
        <DropdownMenuItem onClick={() => handleAction("download")}>
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("preview")}>
          Preview
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {commonItems}
      </>
    );
  }
);

// Named exports for better code splitting
export { ContextMenuItems as default };
