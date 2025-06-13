import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { logger } from "@/utils/logger";
import { Table } from "@tanstack/react-table";
import { useState } from "react";

interface DataTableActionDialogProps<TData> {
  table: Table<TData>;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  onConfirm: (selectedIds: string[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export function DataTableActionDialog<TData>({
  table,
  title = "Perform Action",
  description = "Are you sure you want to perform this action? This cannot be undone.",
  confirmButtonText = "Confirm",
  onConfirm,
  trigger = "Perform Action",
}: DataTableActionDialogProps<TData>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  // Log selected rows when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      logger.info(
        "Selected row IDs:",
        selectedRows.map((row) => (row.original as any).id)
      );
    }
    setOpen(open);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const selectedIds = selectedRows.map((row) => (row.original as any).id);
      logger.info("Confirming action for IDs:", selectedIds);
      await onConfirm(selectedIds);
      setOpen(false);
      // Clear row selection after successful action
      table.toggleAllRowsSelected(false);
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`${title} (${selectedCount})`}
      description={description}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted *:text-destructive"
      bodyClassName="p-6 md:p-8 gap-8"
      trigger={trigger}
      disabled={selectedCount === 0}
    >
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? "Processing..." : confirmButtonText}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
