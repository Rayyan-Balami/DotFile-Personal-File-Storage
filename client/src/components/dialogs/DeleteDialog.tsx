import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDialogStore } from "@/stores/useDialogStore";
import { toast } from "sonner";
import { useMoveFileToTrash, usePermanentDeleteFile } from "@/api/file/file.query";
import { useMoveToTrash, usePermanentDelete } from "@/api/folder/folder.query";
import { logger } from "@/lib/utils";
import { getErrorMessage } from "@/utils/apiErrorHandler";
import { useQueryClient } from "@tanstack/react-query";

export function DeleteDialog() {
  const {
    deleteDialogOpen,
    deleteItemId,
    deleteItemType,
    deleteItemName,
    deleteItemDeletedAt,
    deleteItemHasDeletedAncestor,
    deleteItemIds,
    deleteItemNames,
    closeDeleteDialog,
  } = useDialogStore();

  const queryClient = useQueryClient();
  const moveFileToTrash = useMoveFileToTrash();
  const permanentDeleteFile = usePermanentDeleteFile();
  const moveFolderToTrash = useMoveToTrash();
  const permanentDeleteFolder = usePermanentDelete();

  const handleDelete = async () => {
    try {
      // Handle multiple items
      if (deleteItemIds && deleteItemIds.length > 0) {
        const isPermanentDelete = !!deleteItemDeletedAt || deleteItemHasDeletedAncestor;
        
        // Process each item
        for (const id of deleteItemIds) {
          if (deleteItemType === "folder") {
            if (isPermanentDelete) {
              await permanentDeleteFolder.mutateAsync(id);
            } else {
              await moveFolderToTrash.mutateAsync(id);
            }
          } else {
            if (isPermanentDelete) {
              await permanentDeleteFile.mutateAsync(id);
            } else {
              await moveFileToTrash.mutateAsync(id);
            }
          }
        }

        // Show success message
        const action = isPermanentDelete ? "permanently deleted" : "moved to trash";
        const itemType = deleteItemType === "folder" ? "Folders" : "Files";
        toast.success(`${itemType} ${action}!`);

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['files', 'trash'] });
      } 
      // Handle single item (existing behavior)
      else if (deleteItemId) {
        if (deleteItemType === "folder") {
          if (deleteItemDeletedAt || deleteItemHasDeletedAncestor) {
            await permanentDeleteFolder.mutateAsync(deleteItemId);
            toast.success("Folder permanently deleted!");
            queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
          } else {
            await moveFolderToTrash.mutateAsync(deleteItemId);
            toast.success("Folder moved to trash!");
            queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
          }
        } else {
          if (deleteItemDeletedAt || deleteItemHasDeletedAncestor) {
            await permanentDeleteFile.mutateAsync(deleteItemId);
            toast.success("File permanently deleted!");
            queryClient.invalidateQueries({ queryKey: ['files'] });
            queryClient.invalidateQueries({ queryKey: ['files', 'trash'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
          } else {
            await moveFileToTrash.mutateAsync(deleteItemId);
            toast.success("File moved to trash!");
            queryClient.invalidateQueries({ queryKey: ['files'] });
            queryClient.invalidateQueries({ queryKey: ['files', 'trash'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
          }
        }
      }
      
      closeDeleteDialog();
    } catch (error: any) {
      logger.error("Delete error:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const isPermanentDelete = !!deleteItemDeletedAt || deleteItemHasDeletedAncestor;
  const isPending = 
    moveFileToTrash.isPending || 
    permanentDeleteFile.isPending || 
    moveFolderToTrash.isPending || 
    permanentDeleteFolder.isPending;

  // Get the appropriate title and description based on whether we're deleting multiple items
  const getDialogContent = () => {
    if (deleteItemIds && deleteItemIds.length > 0) {
      const itemType = deleteItemType === "folder" ? "Folders" : "Files";
      const count = deleteItemIds.length;
      const names = deleteItemNames?.slice(0, 3).join(", ") + (count > 3 ? ` and ${count - 3} more` : "");
      
      return {
        title: isPermanentDelete ? `Permanently Delete ${itemType}` : `Move ${itemType} to Trash`,
        description: isPermanentDelete
          ? `Are you sure you want to permanently delete ${count} ${itemType.toLowerCase()} (${names})? This action cannot be undone.`
          : `Are you sure you want to move ${count} ${itemType.toLowerCase()} (${names}) to trash? You can restore them later.`
      };
    } else {
      return {
        title: isPermanentDelete ? "Permanently Delete Item" : "Move to Trash",
        description: isPermanentDelete
          ? `Are you sure you want to permanently delete "${deleteItemName}"? This action cannot be undone.`
          : `Are you sure you want to move "${deleteItemName}" to trash? You can restore it later.`
      };
    }
  };

  const { title, description } = getDialogContent();

  return (
    <ResponsiveDialog
      title={title}
      description={description}
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