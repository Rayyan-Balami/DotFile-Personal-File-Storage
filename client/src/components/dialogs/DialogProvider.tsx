import { CreateFolderDialog } from "@/components/dialogs/CreateFolderDialog";
import { DeleteDialog } from "@/components/dialogs/DeleteDialog";
import { DuplicateItemDialog } from "@/components/dialogs/DuplicateItemDialog";
import FilePreviewDialog from "@/components/dialogs/FilePreviewDialog";
import FolderColorDialog from "@/components/dialogs/FolderColorDialog";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { UploadChoiceDialog } from "@/components/dialogs/UploadChoiceDialog";
import { useDialogStore } from "@/stores/useDialogStore";

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
    uploadChoiceDialogOpen,
    folderColorDialogOpen,
    filePreviewDialogOpen,
  } = useDialogStore();

  return (
    <>
      {createFolderOpen && <CreateFolderDialog />}
      {renameDialogOpen && <RenameDialog />}
      {duplicateDialogOpen &&
        duplicateItemName &&
        duplicateItemType &&
        duplicateItemAction && (
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
      {folderColorDialogOpen && <FolderColorDialog />}
      {filePreviewDialogOpen && <FilePreviewDialog />}
    </>
  );
}
