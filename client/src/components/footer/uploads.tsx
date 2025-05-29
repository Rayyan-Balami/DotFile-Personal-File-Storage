import { Button } from "@/components/ui/button";
import { Folder, File, Loader2, X } from "lucide-react";
import { getFolderNameFromZip, isZipFile } from "@/utils/uploadUtils";
import { useUploadStore } from "@/stores/useUploadStore";
import { formatFileSize } from "@/utils/formatUtils";
import { useEffect, useState } from "react";

interface UploadItemProps {
  id: string;
  fileName: string;
  fileSize: string;
  isFolder?: boolean;
  status: 'creating-zip' | 'uploading' | 'success' | 'error';
  progress?: number;
  onCancel?: (id: string) => void;
  isPaused?: boolean;
}

function UploadCard({
  id,
  fileName,
  fileSize,
  isFolder = false,
  status = 'uploading',
  progress = 0,
  onCancel,
  isPaused = false,
}: UploadItemProps) {
  const icon = isFolder ? 
    <Folder className="text-muted-foreground" /> : 
    <File className="text-muted-foreground" />;
  
  const handleCancel = () => {
    if (onCancel) onCancel(id);
  };

  // Auto-remove after 5 seconds when upload is successful, but pause when hovering
  useEffect(() => {
    if (status === 'success' && onCancel && !isPaused) {
      const timer = setTimeout(() => {
        onCancel(id);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, onCancel, id, isPaused]);

  // For folder uploads, show the original folder name without the ZIP prefix
  const displayName = isFolder && isZipFile(fileName) 
    ? getFolderNameFromZip(fileName) 
    : fileName;

  return (
    <div className="group flex items-center h-12 p-1.5 gap-2 rounded-md bg-sidebar hover:bg-muted border hover:shadow-xs min-w-48 shrink-0 transition-colors ease-out duration-100 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none whitespace-nowrap">
      <div className="h-full grid place-items-center aspect-square bg-sidebar rounded-[0.5rem] *:scale-65">
        {icon}
      </div>
      <div className="flex-1 flex flex-col justify-between text-xs text-muted-foreground pr-4 mx-1">
        <span className="font-medium">{displayName}</span>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs font-light text-muted-foreground">
            {fileSize}
          </span>
          {(status === 'uploading' || status === 'creating-zip') && progress > 0 && (
            <span className="text-xs font-light text-muted-foreground ml-auto">
              {progress}%
            </span>
          )}
        </div>
      </div>
      {(status === 'uploading' || status === 'creating-zip') && (
        <div className="h-full grid place-items-center aspect-square rounded-[0.5rem] *:scale-65">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      )}
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="h-full bg-sidebar grid place-items-center aspect-square rounded-[0.5rem] *:scale-65 shadow-none hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
      >
        <X className="size-auto animate-pulse" />
      </Button>
    </div>
  );
}

export function Uploads() {
  const { uploads, cancelUpload } = useUploadStore();
  const [isHovering, setIsHovering] = useState(false);

  const handleCloseAll = () => {
    uploads.forEach(upload => cancelUpload(upload.id));
  };

  // Only show if there are active uploads
  if (uploads.length === 0) {
    return null;
  }

  return (
    <section 
      className="w-auto flex items-center gap-3.5 px-4 pt-3 overflow-x-scroll pb-3"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 rounded-md text-xs font-medium"
        title="Close all uploads"
        onClick={handleCloseAll}
      >
        Close Uploads
      </Button>
      <div className="flex items-center gap-2 overflow-x-auto w-full">
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
            isPaused={isHovering}
          />
        ))}
      </div>
    </section>
  );
}
