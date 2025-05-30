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
import { createZipFromFiles } from "@/utils/uploadUtils";
import { getDetailedErrorInfo } from "@/utils/apiErrorHandler";
import { toast } from "sonner";

export function NavUpload() {
  const params = useParams({ strict: false });
  const matches = useMatches();
  const uploadFiles = useUploadFiles();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();

  const isReadOnlyContext = matches.some(match =>
    match.routeId.includes("/(user)/trash") ||
    match.routeId.includes("/(user)/recent")
  );

  const getCurrentFolderId = () => params.id || null;

  const handleUpload = async () => {
    if (isReadOnlyContext) return toast.error("Cannot upload files in this view");

    const fileInput = document.createElement("input");
    const folderInput = document.createElement("input");

    Object.assign(fileInput, {
      type: "file",
      multiple: true,
      style: "display: none"
    });

    Object.assign(folderInput, {
      type: "file",
      multiple: true,
      style: "display: none"
    });
    folderInput.setAttribute("webkitdirectory", "");
    folderInput.setAttribute("directory", "");

    const handleChange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      const folderId = getCurrentFolderId();
      if (!files || files.length === 0) return;

      const filesByDirectory = new Map<string, File[]>();
      const individualFiles: File[] = [];

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

      try {
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
            uploadId
          });

          setUploadStatus(uploadId, "success");
        }

        if (individualFiles.length > 0) {
          const fileUploadIds = individualFiles.map(file => addUpload(file, folderId));
          uploadIds.push(...fileUploadIds);

          await uploadFiles.mutateAsync({
            files: individualFiles,
            folderData: folderId ? { folderId } : undefined,
            onProgress: progress => fileUploadIds.forEach(id => updateUploadProgress(id, progress)),
            uploadId: fileUploadIds[0]
          });

          fileUploadIds.forEach(id => setUploadStatus(id, "success"));
        }

        const folderCount = filesByDirectory.size;
        const fileCount = individualFiles.length;
        toast.success(`Uploaded ${folderCount} folder(s) and ${fileCount} file(s)`);

      } catch (error) {
        const errorInfo = getDetailedErrorInfo(error);
        toast.error(errorInfo.message);
        uploadIds.forEach(id => setUploadStatus(id, "error"));
      }

      document.body.removeChild(target);
    };

    fileInput.onchange = handleChange;
    folderInput.onchange = handleChange;
    document.body.append(fileInput, folderInput);

    const isFolder = await new Promise(resolve => resolve(confirm("Upload folder? OK = Folder, Cancel = Files")));
    (isFolder ? folderInput : fileInput).click();
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
