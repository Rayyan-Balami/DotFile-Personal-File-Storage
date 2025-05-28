import { SortOptions } from "@/components/footer/sort-options";
import { UploadItem } from "@/components/footer/upload-item";
import { ViewOptions } from "@/components/footer/view-options";
import { SearchForm } from "@/components/search-form";
import { ButtonGroup } from "@/components/ui/button-group";
import { useUploadStore } from "@/stores/useUploadStore";
import { formatFileSize } from "@/utils/formatUtils";
import GlobalDelete from "./global-delete";
import GlobalMove from "./global-move";

export function SiteFooter() {
  const { uploads, cancelUpload } = useUploadStore();

  // Only show the upload section if there are active uploads
  const hasActiveUploads = uploads.length > 0;

  return (
    <footer className="mt-auto bg-background/80 backdrop-blur-md sticky bottom-0 z-50 border-t transition-[height]">
      {hasActiveUploads && (
        <div className="flex w-full flex-1 items-center gap-3.5 px-4 pt-3 overflow-x-auto pb-3">
          {uploads.map((upload) => (
            <UploadItem
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
      )}
      <nav className="flex h-(--footer-height) w-full flex-1 items-center gap-3.5 px-4">
        <ViewOptions />
        <SearchForm />
          <ButtonGroup orientation="horizontal" className="*:border">
            <SortOptions />
            <GlobalDelete />
            <GlobalMove />
          </ButtonGroup>
      </nav>
    </footer>
  );
}
