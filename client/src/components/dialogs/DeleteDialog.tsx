import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDialogStore } from "@/stores/useDialogStore";
import { toast } from "sonner";
import { useMoveFileToTrash, usePermanentDeleteFile } from "@/api/file/file.query";
import { useMoveToTrash, usePermanentDelete, useEmptyTrash } from "@/api/folder/folder.query";
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
  const emptyTrash = useEmptyTrash();

  const handleDelete = async () => {
    try {
      // Handle special case for empty trash
      if (deleteItemId === "empty-trash") {
        await emptyTrash.mutateAsync();
        toast.success("Trash emptied successfully");
        queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['files', 'trash'] });
        closeDeleteDialog();
        return;
      }
      // Handle multiple items
      if (deleteItemIds && deleteItemIds.length > 0) {
        const isPermanentDelete = !!deleteItemDeletedAt || deleteItemHasDeletedAncestor;
        
        // Group items by type
        const folders = deleteItemIds.filter(id => {
          const item = deleteItemNames[deleteItemIds.indexOf(id)];
          return item.toLowerCase().includes('folder');
        });
        const files = deleteItemIds.filter(id => {
          const item = deleteItemNames[deleteItemIds.indexOf(id)];
          return !item.toLowerCase().includes('folder');
        });
        
        // Process folders
        for (const id of folders) {
          if (isPermanentDelete) {
            await permanentDeleteFolder.mutateAsync(id);
          } else {
            await moveFolderToTrash.mutateAsync(id);
          }
        }

        // Process files
        for (const id of files) {
          if (isPermanentDelete) {
            await permanentDeleteFile.mutateAsync(id);
          } else {
            await moveFileToTrash.mutateAsync(id);
          }
        }

        // Show success message
        const action = isPermanentDelete ? "permanently deleted" : "moved to trash";
        const messages = [];
        if (folders.length > 0) {
          messages.push(`${folders.length} folder${folders.length > 1 ? 's' : ''}`);
        }
        if (files.length > 0) {
          messages.push(`${files.length} file${files.length > 1 ? 's' : ''}`);
        }
        toast.success(`${messages.join(' and ')} ${action}!`);

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
    permanentDeleteFolder.isPending ||
    emptyTrash.isPending;

  // Get the appropriate title and description based on whether we're deleting multiple items
  const getDialogContent = () => {
    // Handle special case for empty trash
    if (deleteItemId === "empty-trash") {
      return {
        title: "Empty Trash",
        description: "Are you sure you want to permanently delete all items in trash? This action cannot be undone."
      };
    }
    if (deleteItemIds && deleteItemIds.length > 0) {
      // Group items by type
      const folders = deleteItemIds.filter(id => {
        const item = deleteItemNames[deleteItemIds.indexOf(id)];
        return item.toLowerCase().includes('folder');
      });
      const files = deleteItemIds.filter(id => {
        const item = deleteItemNames[deleteItemIds.indexOf(id)];
        return !item.toLowerCase().includes('folder');
      });

      const messages = [];
      if (folders.length > 0) {
        messages.push(`${folders.length} folder${folders.length > 1 ? 's' : ''}`);
      }
      if (files.length > 0) {
        messages.push(`${files.length} file${files.length > 1 ? 's' : ''}`);
      }

      const names = deleteItemNames?.slice(0, 3).join(", ") + (deleteItemIds.length > 3 ? ` and ${deleteItemIds.length - 3} more` : "");
      
      return {
        title: isPermanentDelete ? `Permanently Delete Items` : `Move Items to Trash`,
        description: isPermanentDelete
          ? `Are you sure you want to permanently delete ${messages.join(' and ')} (${names})? This action cannot be undone.`
          : `Are you sure you want to move ${messages.join(' and ')} (${names}) to trash? You can restore them later.`
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
          onClick={handleDelete}
          loading={isPending}
          disabled={isPending}
          className="text-white bg-red-600 hover:bg-red-700"
        >
          {isPermanentDelete ? "Delete Permanently" : "Move to Trash"}
        </Button>
      </div>
    </ResponsiveDialog>
  );
} 