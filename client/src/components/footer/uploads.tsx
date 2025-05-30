import { Button } from "@/components/ui/button";
import { useUploadStore } from "@/stores/useUploadStore";
import { formatFileSize } from "@/utils/formatUtils";
import { getFolderNameFromZip, isZipFile } from "@/utils/uploadUtils";
import { TriangleAlert, File, Folder, Loader2, X, Ban, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface UploadItemProps {
  id: string;
  fileName: string;
  fileSize: string;
  isFolder?: boolean;
  status: "creating-zip" | "uploading" | "success" | "error" | "cancelled";
  progress?: number;
  onCancel?: (id: string) => void;
}

function UploadCard({
  id,
  fileName,
  fileSize,
  isFolder = false,
  status = "uploading",
  progress = 0,
  onCancel,
}: UploadItemProps) {
  const icon = isFolder ? (
    <Folder className={cn(
      "text-muted-foreground",
      status === "error" && "text-destructive",
      status === "cancelled" && "text-yellow-600"
    )} />
  ) : (
    <File className={cn(
      "text-muted-foreground",
      status === "error" && "text-destructive",
      status === "cancelled" && "text-yellow-600"
    )} />
  );

  const handleCancel = () => {
    if (onCancel) onCancel(id);
  };

  const displayName =
    isFolder && isZipFile(fileName) ? getFolderNameFromZip(fileName) : fileName;

  return (
    <div className={cn(
      "group flex items-center h-12 p-1.5 gap-2 rounded-md bg-sidebar hover:bg-muted border hover:shadow-xs min-w-48 shrink-0 transition-colors ease-out duration-100 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none whitespace-nowrap",
      status === "error" && "border-destructive/50",
      status === "cancelled" && "border-yellow-400"
    )}>
      <div className={cn(
        "h-full grid place-items-center aspect-square bg-sidebar rounded-[0.5rem] *:scale-65",
        status === "error" && "bg-destructive/10",
        status === "cancelled" && "bg-yellow-400/10"
      )}>
        {icon}
      </div>
      <div className="flex-1 flex flex-col justify-between text-xs text-muted-foreground mx-1 pr-1">
        <span className={cn(
          "font-medium",
          status === "error" && "text-destructive",
          status === "cancelled" && "text-yellow-600"
        )}>{displayName}</span>
        <div className="flex items-center gap-2 w-full">
          <span className={cn(
            "text-xs font-light text-muted-foreground",
            status === "error" && "text-destructive",
            status === "cancelled" && "text-yellow-600"
          )}>
            {fileSize}
          </span>
          {(status === "uploading" || status === "creating-zip") &&
            progress > 0 && (
              <span className="text-xs font-light text-muted-foreground ml-auto">
                {progress}%
              </span>
            )}
          {status === "error" && (
            <span className="text-xs font-medium text-destructive ml-auto flex items-center gap-1">
              <TriangleAlert className="size-3" />
              Failed
            </span>
          )}
          {status === "cancelled" && (
            <span className="text-xs font-medium text-yellow-600 ml-auto flex items-center gap-1">
              <Ban className="size-3" />
              Cancelled
            </span>
          )}
        </div>
      </div>
      {(status === "uploading" || status === "creating-zip") && (
        <>
        <div className="h-full grid place-items-center aspect-square rounded-[0.5rem] *:scale-65">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="h-full bg-sidebar grid place-items-center aspect-square rounded-[0.5rem] *:scale-65 shadow-none hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
      >
        <X className="size-auto animate-pulse" />
      </Button>
      </>
      )}
    </div>
  );
}

export function Uploads() {
  const { uploads, cancelUpload, clearCompleted } = useUploadStore();
  const [isVisible, setIsVisible] = React.useState(false);

  // Check if any upload is in progress
  const hasActiveUploads = uploads.some(
    upload => upload.status === "uploading" || upload.status === "creating-zip"
  );

  // Show section when new uploads start
  React.useEffect(() => {
    if (uploads.length > 0) {
      setIsVisible(true);
    }
  }, [uploads]);

  const handleClose = () => {
    if (!hasActiveUploads) {
      setIsVisible(false);
      clearCompleted(); // Clear all completed/failed/cancelled uploads when closing
    }
  };

  // Only show if there are uploads and section is visible
  if (uploads.length === 0 || !isVisible) {
    return null;
  }

  return (
    <section className="w-full flex gap-3.5 px-4 pt-3 pb-3">
      <Button
        className="group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border size-12 disabled:cursor-not-allowed disabled:opacity-50"
        variant="secondary"
        onClick={handleClose}
        disabled={hasActiveUploads}
        title={hasActiveUploads ? "Cannot close while uploads are in progress" : "Close uploads"}
      >
        <ChevronDown className="size-5 group-hover:scale-105 transition-transform" />
        <span className="sr-only">Close uploads section</span>
      </Button>
      <div className="flex items-center gap-2 overflow-x-auto min-w-0 flex-1">
        {uploads.map((upload) => (
          <UploadCard
            key={upload.id}
            id={upload.id}
            fileName={upload.fileName}
            fileSize={formatFileSize(upload.fileSize)}
            isFolder={upload.isFolder}
            status={upload.status}
            progress={upload.progress}
            onCancel={cancelUpload}
          />
        ))}
      </div>
    </section>
  );
}
