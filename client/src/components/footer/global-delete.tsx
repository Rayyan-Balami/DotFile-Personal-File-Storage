import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDialogStore } from "@/stores/useDialogStore";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { Trash2 } from "lucide-react";
import { ComponentProps } from "react";

export function GlobalDelete(props: ComponentProps<typeof Button>) {
  const { openDeleteDialog } = useDialogStore();
  const { getSelectedItems } = useSelectionStore();

  const handleDelete = () => {
    const selectedItems = getSelectedItems();
    console.log('Global Delete - Selected Items:', {
      count: selectedItems.length,
      items: selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.cardType
      }))
    });

    if (selectedItems.length === 0) return;

    // Group items by type
    const folders = selectedItems.filter(item => item.cardType === 'folder');
    const files = selectedItems.filter(item => item.cardType === 'document');

    console.log('Global Delete - Grouped Items:', {
      folders: folders.map(f => ({ id: f.id, name: f.name })),
      files: files.map(f => ({ id: f.id, name: f.name }))
    });

    // Check if any selected items are in trash or have deleted ancestors
    const hasDeletedItems = selectedItems.some(item => item.deletedAt || item.hasDeletedAncestor);
    
    // Open a single dialog for all items
    const allIds = selectedItems.map(item => item.id);
    const allNames = selectedItems.map(item => `${item.name} (${item.cardType})`);

    openDeleteDialog(
      allIds,
      folders.length > 0 && files.length > 0 ? 'folder' : folders.length > 0 ? 'folder' : 'document',
      allNames,
      hasDeletedItems ? 'deleted' : null,
      hasDeletedItems
    );
  };

  return (
    <Button
      {...props}
      variant="secondary"
      onClick={handleDelete}
      className={cn(
        "group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border",
        props.className
      )}
      disabled={getSelectedItems().length === 0}
    >
      <Trash2 className="size-4 group-hover:scale-105 transition-transform" />
      <span className="sr-only">Delete Selected Items</span>
    </Button>
  );
}
