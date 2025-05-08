import { useDialogStore } from "@/stores/useDialogStore";
import React from "react";
import { ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";

// Context menu items component
export const ContextMenuItems = React.memo(() => {
  const { openCreateFolderDialog } = useDialogStore();
  
  // Handle the action
  const handleAction = (action: string) => {
    console.log(`Action triggered: ${action}`);
    if (action === "createFolder") {
      openCreateFolderDialog();
    }
  };

  return (
    <>
      <ContextMenuItem onClick={() => handleAction("uploadFile")}>
        Upload File
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction("createFolder")}>
        Create Folder
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => handleAction("refresh")}>
        Refresh
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction("selectAll")}>
        Select All
      </ContextMenuItem>
    </>
  );
});

ContextMenuItems.displayName = "ContextMenuItems";

// Named exports for better code splitting
export default ContextMenuItems;