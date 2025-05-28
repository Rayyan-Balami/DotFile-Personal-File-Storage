import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogStore } from "@/stores/useDialogStore";
import { useSelectionStore } from "@/stores/useSelectionStore";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function GlobalDelete(props: ComponentProps<typeof Button>) {
  const { openDeleteDialog } = useDialogStore();
  const { getSelectedItems } = useSelectionStore();

  const handleDelete = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;

    // Group items by type
    const folders = selectedItems.filter(item => item.cardType === 'folder');
    const files = selectedItems.filter(item => item.cardType === 'document');

    // Handle folders
    if (folders.length > 0) {
      openDeleteDialog(
        folders.map(f => f.id),
        "folder",
        folders.map(f => f.name),
        null,
        false
      );
    }

    // Handle files
    if (files.length > 0) {
      openDeleteDialog(
        files.map(f => f.id),
        "document",
        files.map(f => f.name),
        null,
        false
      );
    }
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
    >
      <Trash2 className="size-4 group-hover:scale-105 transition-transform" />
      <span className="sr-only">Delete Selected Items</span>
    </Button>
  );
}
