import React from 'react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "../ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

// Context menu items component
export const ContextMenuItems = React.memo(
  ({
    type,
    title,
    onAction,
  }: {
    type: "folder" | "document";
    title: string;
    onAction: (action: string) => void;
  }) => {
    // Remove setTimeout which can cause timing issues
    const handleAction = (action: string) => {
      onAction(action);
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
          className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/10"
        >
          More Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleAction("delete")}
          variant="destructive"
        >
          Delete
        </ContextMenuItem>
      </>
    );

    if (type === "folder") {
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
    type,
    title,
    onAction,
  }: {
    type: "folder" | "document";
    title: string;
    onAction: (action: string) => void;
  }) => {
    const handleAction = (action: string) => {
      onAction(action);
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
        <DropdownMenuItem onClick={() => handleAction("info")} className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/10">
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

    if (type === "folder") {
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