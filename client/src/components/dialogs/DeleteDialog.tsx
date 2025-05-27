import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDialogStore } from "@/stores/useDialogStore";
import { toast } from "sonner";
import { useMoveFileToTrash, usePermanentDeleteFile } from "@/api/file/file.query";
import { useMoveToTrash, usePermanentDelete } from "@/api/folder/folder.query";
import { logger } from "@/lib/utils";
import { getErrorMessage } from "@/utils/apiErrorHandler";

export function DeleteDialog() {
  const {
    deleteDialogOpen,
    deleteItemId,
    deleteItemType,
    deleteItemName,
    deleteItemDeletedAt,
    closeDeleteDialog,
  } = useDialogStore();

  const moveFileToTrash = useMoveFileToTrash();
  const permanentDeleteFile = usePermanentDeleteFile();
  const moveFolderToTrash = useMoveToTrash();
  const permanentDeleteFolder = usePermanentDelete();

  const handleDelete = async () => {
    try {
      if (deleteItemType === "folder") {
        if (deleteItemDeletedAt) {
          await permanentDeleteFolder.mutateAsync(deleteItemId!);
          toast.success("Folder permanently deleted!");
        } else {
          await moveFolderToTrash.mutateAsync(deleteItemId!);
          toast.success("Folder moved to trash!");
        }
      } else {
        if (deleteItemDeletedAt) {
          await permanentDeleteFile.mutateAsync(deleteItemId!);
          toast.success("File permanently deleted!");
        } else {
          await moveFileToTrash.mutateAsync(deleteItemId!);
          toast.success("File moved to trash!");
        }
      }
      
      closeDeleteDialog();
    } catch (error: any) {
      logger.error("Delete error:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const isPermanentDelete = !!deleteItemDeletedAt;
  const isPending = 
    moveFileToTrash.isPending || 
    permanentDeleteFile.isPending || 
    moveFolderToTrash.isPending || 
    permanentDeleteFolder.isPending;

  return (
    <ResponsiveDialog
      title={isPermanentDelete ? "Permanently Delete Item" : "Move to Trash"}
      description={
        isPermanentDelete
          ? `Are you sure you want to permanently delete "${deleteItemName}"? This action cannot be undone.`
          : `Are you sure you want to move "${deleteItemName}" to trash? You can restore it later.`
      }
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDeleteDialog();
        }
      }}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 overflow-y-auto gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted/50"
      bodyClassName="p-6 md:p-8 gap-8"
    >
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeDeleteDialog}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant={isPermanentDelete ? "destructive" : "default"}
          onClick={handleDelete}
          loading={isPending}
          disabled={isPending}
        >
          {isPermanentDelete ? "Delete Permanently" : "Move to Trash"}
        </Button>
      </div>
    </ResponsiveDialog>
  );
} 