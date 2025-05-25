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

// Context menu items component
export const ContextMenuItems = React.memo(
  ({
    cardType,
    title,
    id,
  }: {
    cardType: "folder" | "document";
    title: string;
    id: string;
  }) => {
    const { openCreateFolderDialog } = useDialogStore();
    
    // Remove setTimeout which can cause timing issues
    const handleAction = (action: string) => {
      console.log(`Action triggered: ${action} on ${title} (${id})`);
      
      if (action === "create-folder") {
        // If we're in a folder, use its ID as the parent
        if (cardType === "folder") {
          openCreateFolderDialog(id);
        }
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
        <ContextMenuItem onClick={() => handleAction("share")}>
          Share
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction("copy-link")}>
          Copy link
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleAction("pin")}>
          Pin/Unpin
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleAction("info")}
          className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20"
        >
          More Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleAction("delete")}
          className="text-destructive focus:text-destructive focus:bg-destructive/20"
        >
          Delete
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
    id
  }: {
    cardType: "folder" | "document";
    title: string;
    id: string;
  }) => {
    const { openCreateFolderDialog } = useDialogStore();
    
    const handleAction = (action: string) => {
      console.log(`Action triggered: ${action} on ${title} (${id})`);
      
      if (action === "create-folder") {
        // If we're in a folder, use its ID as the parent
        if (cardType === "folder") {
          openCreateFolderDialog(id);
        }
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
        <DropdownMenuItem onClick={() => handleAction("share")}>
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction("copy-link")}>
          Copy link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction("pin")}>
          Pin/Unpin
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction("info")} className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20">
          More Info
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleAction("delete")}
          variant="destructive"
        >
          Delete
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
