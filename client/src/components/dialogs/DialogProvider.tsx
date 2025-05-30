"use client";

import { useDialogStore } from "@/stores/useDialogStore";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { RenameDialog } from "./RenameDialog";
import { DuplicateItemDialog } from "./DuplicateItemDialog";
import { DeleteDialog } from "./DeleteDialog";
import { UploadChoiceDialog } from "./UploadChoiceDialog";

export function DialogProvider() {
  const { 
    createFolderOpen, 
    renameDialogOpen,
    duplicateDialogOpen,
    duplicateItemName,
    duplicateItemType,
    duplicateItemAction,
    closeDuplicateDialog,
    deleteDialogOpen,
    uploadChoiceDialogOpen
  } = useDialogStore();

  return (
    <>
      {createFolderOpen && <CreateFolderDialog />}
      {renameDialogOpen && <RenameDialog />}
      {duplicateDialogOpen && duplicateItemName && duplicateItemType && duplicateItemAction && (
        <DuplicateItemDialog
          open={duplicateDialogOpen}
          onOpenChange={(open) => !open && closeDuplicateDialog()}
          itemName={duplicateItemName}
          itemType={duplicateItemType}
          onReplace={() => duplicateItemAction("replace")}
          onKeepBoth={() => duplicateItemAction("keepBoth")}
          onCancel={closeDuplicateDialog}
        />
      )}
      {deleteDialogOpen && <DeleteDialog />}
      {uploadChoiceDialogOpen && <UploadChoiceDialog />}
    </>
  );
}