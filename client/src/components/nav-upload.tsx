import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Upload } from "lucide-react";
import { useMatches, useParams } from "@tanstack/react-router";
import { useUploadFiles } from "@/api/file/file.query";
import { useUploadStore } from "@/stores/useUploadStore";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { createZipFromFiles } from "@/utils/uploadUtils";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { toast } from "sonner";
import { useDialogStore } from "@/stores/useDialogStore";

export function NavUpload() {
  const params = useParams({ strict: false });
  const matches = useMatches();
  const uploadFiles = useUploadFiles();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const { openUploadChoiceDialog, openDuplicateDialog } = useDialogStore();
  const isFolderReadOnly = useFileSystemStore(state => state.isFolderReadOnly);

  const getCurrentFolderId = () => params.id || null;
  const currentFolderId = getCurrentFolderId();

  const isInTrashContext = matches.some(match => match.routeId.includes('/(user)/trash'));
  const isInRecentContext = matches.some(match => match.routeId.includes('/(user)/recent'));
  const isReadOnlyContext = (currentFolderId ? isFolderReadOnly(currentFolderId) : false) || isInTrashContext || isInRecentContext;

  const handleUpload = () => {
    if (isReadOnlyContext) return toast.error("Cannot upload files in this view");

    const handleFileInput = async (choice: "files" | "folder") => {
      const input = document.createElement("input");
      Object.assign(input, {
        type: "file",
        multiple: true,
        style: "display: none"
      });

      if (choice === "folder") {
        input.setAttribute("webkitdirectory", "");
        input.setAttribute("directory", "");
        input.setAttribute("mozdirectory", "");
        input.setAttribute("msdirectory", "");
      }

      const handleChange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        const folderId = getCurrentFolderId();
        if (!files || files.length === 0) return;

        const filesByDirectory = new Map<string, File[]>();
        const individualFiles: File[] = [];

        // Group files by directory
        Array.from(files).forEach(file => {
          const relativePath = file.webkitRelativePath;
          const pathParts = relativePath.split("/");

          if (pathParts.length > 1) {
            const rootDir = pathParts[0];
            if (!filesByDirectory.has(rootDir)) filesByDirectory.set(rootDir, []);
            filesByDirectory.get(rootDir)!.push(file);
          } else {
            individualFiles.push(file);
          }
        });

        const uploadIds: string[] = [];
        let retryWithDuplicateAction: "replace" | "keepBoth" | undefined;

        const handleDuplicateError = async (fileName: string, fileType: "file" | "folder") => {
          return new Promise<void>((resolve, reject) => {
            openDuplicateDialog(fileName, fileType, async (action: "replace" | "keepBoth") => {
              retryWithDuplicateAction = action;
              try {
                // Retry the upload with the chosen action
                await processUploads();
                resolve();
              } catch (retryError) {
                reject(retryError);
              }
            });
          });
        };

        const processUploads = async () => {
          // Handle directory uploads first
          for (const [dirName, dirFiles] of filesByDirectory) {
            if (dirFiles.length === 0) continue;

            const totalSize = dirFiles.reduce((sum, file) => sum + file.size, 0);
            const uploadId = addUpload({ name: `${dirName}.zip`, size: totalSize, isFolder: true }, folderId);
            uploadIds.push(uploadId);

            const zipFile = await createZipFromFiles(
              dirFiles.map(file => ({ file, path: file.webkitRelativePath })),
              dirName,
              progress => {
                updateUploadProgress(uploadId, progress);
                if (progress === 100) setUploadStatus(uploadId, "uploading");
              }
            );

            await uploadFiles.mutateAsync({
              files: [zipFile],
              folderData: folderId ? { folderId } : undefined,
              onProgress: progress => updateUploadProgress(uploadId, progress),
              uploadId,
              duplicateAction: retryWithDuplicateAction
            });

            setUploadStatus(uploadId, "success");
          }

          // Then handle individual files
          if (individualFiles.length > 0) {
            const fileUploadIds = individualFiles.map(file => addUpload(file, folderId));
            uploadIds.push(...fileUploadIds);

            await uploadFiles.mutateAsync({
              files: individualFiles,
              folderData: folderId ? { folderId } : undefined,
              onProgress: progress => fileUploadIds.forEach(id => updateUploadProgress(id, progress)),
              uploadId: fileUploadIds[0],
              duplicateAction: retryWithDuplicateAction
            });

            fileUploadIds.forEach(id => setUploadStatus(id, "success"));
          }
        };

        try {
          await processUploads();
          const folderCount = filesByDirectory.size;
          const fileCount = individualFiles.length;
          toast.success(`Uploaded ${folderCount} folder(s) and ${fileCount} file(s)`);
        } catch (error: any) {
          if (error.response?.status === 409 && !retryWithDuplicateAction) {
            const fileName = individualFiles[0]?.name || Array.from(filesByDirectory.keys())[0] || 'file';
            const fileType = individualFiles.length > 0 ? 'file' : 'folder';
            await handleDuplicateError(fileName, fileType);
            return;
          }

          const errorInfo = getDetailedErrorInfo(error);
          toast.error(errorInfo.message);
          uploadIds.forEach(id => setUploadStatus(id, "error"));
        }

        document.body.removeChild(target);
      };

      input.onchange = handleChange;
      document.body.appendChild(input);
      input.click();
    };

    // Open dialog for user to choose between files and folder upload
    openUploadChoiceDialog(handleFileInput);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Upload Files or Folders"
              variant="outline"
              onClick={handleUpload}
              className="w-full justify-center border bg-primary/10 hover:bg-primary/20 border-primary-foreground/30 text-primary-foreground hover:text-primary-foreground
              dark:bg-primary-foreground/20 dark:hover:bg-primary-foreground/30 dark:border-primary/30 dark:text-primary dark:hover:text-primary cursor-pointer"
              disabled={isReadOnlyContext}
            >
              <Upload />
              <span>Upload</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
