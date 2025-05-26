"use client";

import { useDialogStore } from "@/stores/useDialogStore";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { RenameDialog } from "./RenameDialog";

export function DialogProvider() {
  const { createFolderOpen, renameDialogOpen } = useDialogStore();

  return (
    <>
      {createFolderOpen && <CreateFolderDialog />}
      {renameDialogOpen && <RenameDialog />}
    </>
  );
}