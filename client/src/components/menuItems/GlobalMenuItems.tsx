import { useDialogStore } from "@/stores/useDialogStore";
import React from "react";
import { ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";

// Context menu items component
export const ContextMenuItems = React.memo(({ parentId }: { parentId?: string | null } = {}) => {
  const { openCreateFolderDialog } = useDialogStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Handle the action
  const handleAction = (action: string) => {
    console.log(`Action triggered: ${action}`);
    if (action === "createFolder") {
      // Pass the parent ID (null for root)
      openCreateFolderDialog(parentId);
    } else if (action === "uploadFile") {
      // Trigger file input click
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };
  
  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Here you would call your upload function
      console.log("Selected files:", files);
      console.log("Parent folder ID:", parentId);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* File Operations */}
      <ContextMenuItem onClick={() => handleAction("createFolder")}>
        Create New Folder
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction("uploadFile")}>
        Upload File
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* Selection Operations */}
      <ContextMenuItem onClick={() => handleAction("selectAll")}>
        Select All
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* View Operations */}
      <ContextMenuItem onClick={() => handleAction("refresh")}>
        Refresh
      </ContextMenuItem>
    </>
  );
});

ContextMenuItems.displayName = "ContextMenuItems";

// Named exports for better code splitting
export default ContextMenuItems;