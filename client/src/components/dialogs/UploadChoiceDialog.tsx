import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDialogStore } from "@/stores/useDialogStore";

export function UploadChoiceDialog() {
  const {
    uploadChoiceDialogOpen,
    uploadChoiceCallback,
    closeUploadChoiceDialog,
  } = useDialogStore();

  const handleChoice = (choice: "files" | "folder") => {
    if (uploadChoiceCallback) {
      uploadChoiceCallback(choice);
    }
    closeUploadChoiceDialog();
  };

  return (
    <ResponsiveDialog
      title="Choose Upload Type"
      description="Would you like to upload files or a folder?"
      open={uploadChoiceDialogOpen}
      onOpenChange={(open) => {
        if (!open) closeUploadChoiceDialog();
      }}
      contentClassName="max-h-[80svh] max-md:-mt-8.5 overflow-y-auto gap-0"
      headerClassName="p-6 max-md:pt-8 pb-4 md:p-8 md:pb-6 border-b bg-muted"
      bodyClassName="p-6 md:p-8 gap-8"
    >
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeUploadChoiceDialog}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => handleChoice("files")}
        >
          Upload Files
        </Button>
        <Button type="button" onClick={() => handleChoice("folder")}>
          Upload Folder
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
