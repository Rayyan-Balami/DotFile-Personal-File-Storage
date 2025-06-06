import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface DuplicateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: "folder" | "file";
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
}

export function DuplicateItemDialog({
  open,
  onOpenChange,
  itemName,
  itemType,
  onReplace,
  onKeepBoth,
  onCancel,
}: DuplicateItemDialogProps) {
  return (
    <ResponsiveDialog
      title={`A ${itemType === "folder" ? "Folder" : "File"} Already Exists`}
      description={`A ${itemType} named "${itemName}" already exists in this location. What would you like to do?`}
      open={open}
      onOpenChange={(open) => {
        if (!open) onCancel();
        onOpenChange(open);
      }}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted"
      bodyClassName="p-6 md:p-8 gap-8"
    >


        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="border border-border"
            onClick={onKeepBoth}
          >
            Keep Both
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onReplace}
          >
            Replace Existing {itemType === "folder" ? "Folder" : "File"}
          </Button>
        </div>
    </ResponsiveDialog>
  );
}
