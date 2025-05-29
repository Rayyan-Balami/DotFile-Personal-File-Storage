import { Button } from "@/components/ui/button";
import { useUploadStore } from "@/stores/useUploadStore";
import { formatFileSize } from "@/utils/formatUtils";
import { getFolderNameFromZip, isZipFile } from "@/utils/uploadUtils";
import { TriangleAlert, File, Folder, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadItemProps {
  id: string;
  fileName: string;
  fileSize: string;
  isFolder?: boolean;
  status: "creating-zip" | "uploading" | "success" | "error";
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
      status === "error" && "text-destructive"
    )} />
  ) : (
    <File className={cn(
      "text-muted-foreground",
      status === "error" && "text-destructive"
    )} />
  );

  const handleCancel = () => {
    if (onCancel) onCancel(id);
  };

  // For folder uploads, show the original folder name without the ZIP prefix
  const displayName =
    isFolder && isZipFile(fileName) ? getFolderNameFromZip(fileName) : fileName;

  return (
    <div className={cn(
      "group flex items-center h-12 p-1.5 gap-2 rounded-md bg-sidebar hover:bg-muted border hover:shadow-xs min-w-48 shrink-0 transition-colors ease-out duration-100 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none whitespace-nowrap",
      status === "error" && "border-destructive/50"
    )}>
      <div className={cn(
        "h-full grid place-items-center aspect-square bg-sidebar rounded-[0.5rem] *:scale-65",
        status === "error" && "bg-destructive/10"
      )}>
        {icon}
      </div>
      <div className="flex-1 flex flex-col justify-between text-xs text-muted-foreground pr-4 mx-1">
        <span className={cn(
          "font-medium",
          status === "error" && "text-destructive"
        )}>{displayName}</span>
        <div className="flex items-center gap-2 w-full">
          {/* <span className="text-xs font-light text-muted-foreground"> */}
          <span className={cn(
            "text-xs font-light text-muted-foreground",
            status === "error" && "text-destructive"
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
        </div>
      </div>
      {(status === "uploading" || status === "creating-zip") && (
        <div className="h-full grid place-items-center aspect-square rounded-[0.5rem] *:scale-65">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      )}
      <Button
        variant="ghost"
        onClick={handleCancel}
        className={cn(
          "h-full bg-sidebar grid place-items-center aspect-square rounded-[0.5rem] *:scale-65 shadow-none hover:bg-muted-foreground/10",
          status === "error" 
            ? "text-destructive hover:text-destructive hover:bg-destructive/10" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <X className="size-auto animate-pulse" />
      </Button>
    </div>
  );
}

export function Uploads() {
  const { uploads, cancelUpload } = useUploadStore();

  const handleCloseAll = () => {
    uploads.forEach((upload) => cancelUpload(upload.id));
  };

  // Only show if there are active uploads
  if (uploads.length === 0) {
    return null;
  }

  return (
    <section className="w-full flex items-center gap-3.5 px-4 pt-3 pb-3">
      <Button
        className="group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
        variant="secondary"
        onClick={handleCloseAll}
      >
        <X className="size-4 group-hover:scale-105 transition-transform" />
        <span className="sr-only">Close all uploads</span>
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