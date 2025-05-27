import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { AlertCircle } from "lucide-react";

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
      title="Duplicate Item Detected"
      description={`A ${itemType} with the name "${itemName}" already exists in this location.`}
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 overflow-y-auto gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted/50"
      bodyClassName="p-6 md:p-8 gap-8"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">What would you like to do?</p>
            <p className="text-sm text-muted-foreground">
              {itemType === "folder" 
                ? "You can replace the existing folder or keep both folders."
                : "You can replace the existing file or keep both files."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            variant="destructive" 
            onClick={onReplace}
          >
            Replace Existing {itemType === "folder" ? "Folder" : "File"}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onKeepBoth}
          >
            Keep Both
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
} 