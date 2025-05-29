import { Button } from "@/components/ui/button";
import { Folder, FileText, Loader2, X } from "lucide-react";
import { getFolderNameFromZip, isZipFile } from "@/utils/uploadUtils";

export interface UploadItemProps {
  id: string;
  fileName: string;
  fileSize: string;
  isFolder?: boolean;
  status: 'creating-zip' | 'uploading' | 'success' | 'error';
  progress?: number;
  onCancel?: (id: string) => void;
}

export function UploadItem({
  id,
  fileName,
  fileSize,
  isFolder = false,
  status = 'uploading',
  progress = 0,
  onCancel,
}: UploadItemProps) {
  const icon = isFolder ? 
    <Folder className="text-muted-foreground" /> : 
    <FileText className="text-muted-foreground" />;
  
  const handleCancel = () => {
    if (onCancel) onCancel(id);
  };

  // For folder uploads, show the original folder name without the ZIP prefix
  const displayName = isFolder && isZipFile(fileName) 
    ? getFolderNameFromZip(fileName) 
    : fileName;

  return (
    <div className="group flex items-center h-12 p-1.5 gap-2 rounded-md bg-sidebar hover:bg-sidebar-foreground/4 border hover:shadow-xs min-w-48 shrink-0 transition-colors ease-out duration-100 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none whitespace-nowrap">
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
        className="h-full bg-muted grid place-items-center aspect-square rounded-[0.5rem] *:scale-65 shadow-none hover:bg-muted-foreground/6 text-muted-foreground hover:text-foreground"
      >
        <X className="size-auto" />
      </Button>
    </div>
  );
}