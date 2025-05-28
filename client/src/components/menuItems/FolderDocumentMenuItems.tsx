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

interface MenuProps {
  cardType: "folder" | "document";
  title: string;
  id: string;
  isPinned?: boolean;
  deletedAt?: string | null;
  hasDeletedAncestor?: boolean;
}

// Custom hook for shared menu logic
const useMenuActions = ({ cardType, title, id }: Pick<MenuProps, 'cardType' | 'title' | 'id'>) => {
  const { openCreateFolderDialog, openRenameDialog, openDeleteDialog } = useDialogStore();
  const queryClient = useQueryClient();
  const restoreFolder = useRestoreFolder();
  const restoreFile = useRestoreFile();
  const updateFolder = useUpdateFolder();
  const updateFile = useUpdateFile();
  const navigate = useNavigate();

  return async (action: string, deletedAt?: string | null, hasDeletedAncestor?: boolean) => {
    const actions = {
      'create-folder': () => cardType === "folder" && openCreateFolderDialog(id),
      'rename': () => openRenameDialog(id, cardType, title),
      'delete': () => openDeleteDialog(id, cardType, title, deletedAt, hasDeletedAncestor),
      'restore': () => {
        const mutation = cardType === "folder" ? restoreFolder : restoreFile;
        mutation.mutate(id, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
            queryClient.invalidateQueries({ queryKey: [cardType === "folder" ? 'folders' : 'files'] });
          }
        });
      },
      'pin': async () => {
        try {
          const mutation = cardType === "folder" ? updateFolder : updateFile;
          const param = cardType === "folder" ? { folderId: id, data: { isPinned: true } } : { fileId: id, data: { isPinned: true } };
          await mutation.mutateAsync(param);
          toast.success(`${title} pinned successfully`);
        } catch (error) {
          toast.error(`Failed to pin ${title}`);
        }
      },
      'unpin': async () => {
        try {
          const mutation = cardType === "folder" ? updateFolder : updateFile;
          const param = cardType === "folder" ? { folderId: id, data: { isPinned: false } } : { fileId: id, data: { isPinned: false } };
          await mutation.mutateAsync(param);
          toast.success(`${title} unpinned successfully`);
        } catch (error) {
          toast.error(`Failed to unpin ${title}`);
        }
      },
      'open': () => navigate({ to: `/${cardType === "folder" ? "folder" : "file"}/${id}` }),
      'open-new-tab': () => {
        const url = `/${cardType === "folder" ? "folder" : "file"}/${id}`;
        window.open(url, '_blank');
      },
      'info': () => toast.info("Info dialog coming soon"),
      'download': () => console.log('Download action'),
      'preview': () => console.log('Preview action'),
      'upload-file': () => console.log('Upload file action'),
    };

    const actionFn = actions[action as keyof typeof actions];
    if (actionFn) await actionFn();
  };
};

// Generic menu items component
const MenuItems = React.memo(({ 
  props, 
  itemComponent: Item, 
  separatorComponent: Separator 
}: {
  props: MenuProps;
  itemComponent: typeof ContextMenuItem | typeof DropdownMenuItem;
  separatorComponent: typeof ContextMenuSeparator | typeof DropdownMenuSeparator;
}) => {
  const { cardType, title, id, isPinned = false, deletedAt = null, hasDeletedAncestor = false } = props;
  const handleAction = useMenuActions({ cardType, title, id });

  const commonItems = (
    <>
      <Item onClick={() => handleAction("open")}>Open</Item>
      <Item onClick={() => handleAction("open-new-tab")}>Open in new tab</Item>
      <Item onClick={() => handleAction("rename")}>Rename</Item>
      <Separator />
      <Item onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
        {isPinned ? "Unpin" : "Pin"}
      </Item>
      <Separator />
      <Item onClick={() => handleAction("info")} className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20">
        More Info
      </Item>
      <Separator />
      {deletedAt && !hasDeletedAncestor && (
        <>
          <Item onClick={() => handleAction("restore")} className="text-green-600 focus:text-green-600 focus:bg-green-700/20">
            Put back
          </Item>
          <Separator />
        </>
      )}
      <Item onClick={() => handleAction("delete", deletedAt, hasDeletedAncestor)} className="text-red-600 focus:text-red-600 focus:bg-red-700/20">
        {deletedAt || hasDeletedAncestor ? "Delete Permanently" : "Move to Trash"}
      </Item>
    </>
  );

  if (cardType === "folder") {
    return (
      <>
        <Item onClick={() => handleAction("create-folder")}>Create new folder</Item>
        <Item onClick={() => handleAction("upload-file")}>Upload file</Item>
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
});

// Context menu items component
export const ContextMenuItems = React.memo((props: MenuProps) => (
  <MenuItems 
    props={props} 
    itemComponent={ContextMenuItem} 
    separatorComponent={ContextMenuSeparator} 
  />
));

// Dropdown menu items component
export const DropdownMenuItems = React.memo((props: MenuProps) => (
  <MenuItems 
    props={props} 
    itemComponent={DropdownMenuItem} 
    separatorComponent={DropdownMenuSeparator} 
  />
));

export { ContextMenuItems as default };
