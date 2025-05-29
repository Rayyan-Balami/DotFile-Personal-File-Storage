import React from 'react';
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "../ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useDialogStore } from "@/stores/useDialogStore";
import { useRestoreFolder, useUpdateFolder } from '@/api/folder/folder.query';
import { useRestoreFile, useUpdateFile, useUploadFiles } from '@/api/file/file.query';
import { useUploadStore } from '@/stores/useUploadStore';
import { processDirectoryInput } from '@/utils/uploadUtils';
import { getDetailedErrorInfo, getErrorMessage } from '@/utils/apiErrorHandler';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

interface MenuProps {
  cardType: "folder" | "document";
  title: string;
  id: string;
  isPinned?: boolean;
  deletedAt?: string | null;
  hasDeletedAncestor?: boolean;
}

// Custom hook for shared menu logic
const useMenuActions = ({ cardType, title, id }: Pick<MenuProps, 'cardType' | 'title' | 'id'>) => {
  const { openCreateFolderDialog, openRenameDialog, openDeleteDialog } = useDialogStore();
  const queryClient = useQueryClient();
  const restoreFolder = useRestoreFolder();
  const restoreFile = useRestoreFile();
  const updateFolder = useUpdateFolder();
  const updateFile = useUpdateFile();
  const uploadFiles = useUploadFiles();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const navigate = useNavigate();

  return async (action: string, deletedAt?: string | null, hasDeletedAncestor?: boolean) => {
    const actions = {
      'create-folder': () => cardType === "folder" && openCreateFolderDialog(id),
      'rename': () => openRenameDialog(id, cardType, title),
      'delete': () => openDeleteDialog(id, cardType, title, deletedAt, hasDeletedAncestor),
      'restore': () => {
        const mutation = cardType === "folder" ? restoreFolder : restoreFile;
        mutation.mutate(id, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', 'trash'] });
            queryClient.invalidateQueries({ queryKey: [cardType === "folder" ? 'folders' : 'files'] });
          }
        });
      },
      'pin': async () => {
        try {
          if (cardType === "folder") {
            await updateFolder.mutateAsync({ folderId: id, data: { isPinned: true } });
          } else {
            await updateFile.mutateAsync({ fileId: id, data: { isPinned: true } });
          }
          toast.success(`${title} pinned successfully`);
        } catch (error) {
          console.error("Pin error:", error);
          toast.error(getErrorMessage(error));
        }
      },
      'unpin': async () => {
        try {
          if (cardType === "folder") {
            await updateFolder.mutateAsync({ folderId: id, data: { isPinned: false } });
          } else {
            await updateFile.mutateAsync({ fileId: id, data: { isPinned: false } });
          }
          toast.success(`${title} unpinned successfully`);
        } catch (error) {
          console.error("Unpin error:", error);
          toast.error(getErrorMessage(error));
        }
      },
      'open': () => navigate({ to: `/${cardType === "folder" ? "folder" : "file"}/${id}` }),
      'open-new-tab': () => {
        const url = `/${cardType === "folder" ? "folder" : "file"}/${id}`;
        window.open(url, '_blank');
      },
      'info': () => toast.info("Info dialog coming soon"),
      'download': () => console.log('Download action'),
      'preview': () => console.log('Preview action'),
      'upload-file': () => {
        // Trigger file input for folder upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        
        fileInput.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          const files = target.files;
          if (files && files.length > 0) {
            const fileArray = Array.from(files);
            let uploadIds: string[] = [];
            
            try {
              // Create upload entries for tracking
              uploadIds = fileArray.map(file => 
                addUpload(file, id)
              );

              // Start the upload
              await uploadFiles.mutateAsync({
                files: fileArray,
                folderData: { folderId: id }
              });

              // Update all uploads to success
              uploadIds.forEach(uploadId => {
                updateUploadProgress(uploadId, 100);
                setUploadStatus(uploadId, 'success');
              });

              toast.success(`Successfully uploaded ${fileArray.length} file(s) to ${title}`);
            } catch (error) {
              console.error("Upload failed:", error);
              
              // Get detailed error information
              const errorInfo = getDetailedErrorInfo(error);
              
              // Show main error message
              toast.error(errorInfo.message);
              
              // Show individual file errors if available
              if (errorInfo.details.length > 1) {
                errorInfo.details.slice(1).forEach((detail: string) => {
                  toast.error(detail, { duration: 5000 });
                });
              }
              
              // Update any pending uploads to error state
              uploadIds.forEach((uploadId: string) => {
                setUploadStatus(uploadId, 'error');
              });
            }
          }
          
          // Clean up
          document.body.removeChild(fileInput);
        };
        
        document.body.appendChild(fileInput);
        fileInput.click();
      },
      'upload-folder': () => {
        // Trigger folder input for folder upload
        const folderInput = document.createElement('input');
        folderInput.type = 'file';
        folderInput.multiple = true;
        folderInput.style.display = 'none';
        // Set webkitdirectory attribute
        folderInput.setAttribute('webkitdirectory', '');
        
        folderInput.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          let zipFiles: File[] = [];
          let uploadIds: string[] = [];
          
          try {
            // First, create upload entries for tracking (in creating-zip state)
            const files = target.files;
            if (!files || files.length === 0) {
              toast.error("No files selected");
              return;
            }

            // Group files by their root directory to determine folder names
            const folderMap = new Map<string, File[]>();
            for (const file of Array.from(files)) {
              const pathParts = file.webkitRelativePath.split('/');
              const rootFolder = pathParts[0];
              if (!folderMap.has(rootFolder)) {
                folderMap.set(rootFolder, []);
              }
              folderMap.get(rootFolder)!.push(file);
            }

            // Create upload entries for each folder
            uploadIds = Array.from(folderMap.keys()).map(folderName => {
              const folderFiles = folderMap.get(folderName)!;
              const totalSize = folderFiles.reduce((sum, file) => sum + file.size, 0);
              return addUpload({ name: `${folderName}.zip`, size: totalSize, isFolder: true }, id);
            });

            // Process the directory input and create zip files with progress tracking
            zipFiles = await processDirectoryInput(target, (folderName: string, progress: number) => {
              // Find the corresponding upload ID and update progress
              const uploadIndex = Array.from(folderMap.keys()).indexOf(folderName);
              if (uploadIndex >= 0 && uploadIndex < uploadIds.length) {
                updateUploadProgress(uploadIds[uploadIndex], progress);
                if (progress === 100) {
                  setUploadStatus(uploadIds[uploadIndex], 'uploading');
                }
              }
            });
            
            if (zipFiles.length === 0) {
              toast.error("No files found in the selected folder");
              // Clean up upload entries
              uploadIds.forEach(uploadId => setUploadStatus(uploadId, 'error'));
              return;
            }

            // Start the upload
            await uploadFiles.mutateAsync({
              files: zipFiles,
              folderData: { folderId: id }
            });

            // Update all uploads to success
            uploadIds.forEach(uploadId => {
              updateUploadProgress(uploadId, 100);
              setUploadStatus(uploadId, 'success');
            });

            toast.success(`Successfully uploaded ${zipFiles.length} folder(s) to ${title}`);
          } catch (error) {
            console.error("Folder upload failed:", error);
            
            // Get detailed error information
            const errorInfo = getDetailedErrorInfo(error);
            
            // Show main error message
            toast.error(errorInfo.message);
            
            // Show individual file errors if available
            if (errorInfo.details.length > 1) {
              errorInfo.details.slice(1).forEach((detail: string) => {
                toast.error(detail, { duration: 5000 });
              });
            }
            
            // Update any pending uploads to error state
            uploadIds.forEach((uploadId: string) => {
              setUploadStatus(uploadId, 'error');
            });
          }
          
          // Clean up
          document.body.removeChild(folderInput);
        };
        
        document.body.appendChild(folderInput);
        folderInput.click();
      },
    };

    const actionFn = actions[action as keyof typeof actions];
    if (actionFn) await actionFn();
  };
};

// Generic menu items component
const MenuItems = React.memo(({ 
  props, 
  itemComponent: Item, 
  separatorComponent: Separator 
}: {
  props: MenuProps;
  itemComponent: typeof ContextMenuItem | typeof DropdownMenuItem;
  separatorComponent: typeof ContextMenuSeparator | typeof DropdownMenuSeparator;
}) => {
  const { cardType, title, id, isPinned = false, deletedAt = null, hasDeletedAncestor = false } = props;
  const handleAction = useMenuActions({ cardType, title, id });

  // Debug logging to check hasDeletedAncestor status
  console.log(`🔍 Menu Debug for "${title}" (${cardType}):`, {
    id,
    deletedAt: deletedAt ? 'YES' : 'NO',
    hasDeletedAncestor: hasDeletedAncestor ? 'YES' : 'NO',
    isDeleted: (deletedAt || hasDeletedAncestor) ? 'YES' : 'NO'
  });

  const isDeleted = deletedAt || hasDeletedAncestor;

  // For deleted items, show only limited actions
  if (isDeleted) {
    return (
      <>
        <Item onClick={() => handleAction("open")}>Open</Item>
        <Item onClick={() => handleAction("open-new-tab")}>Open in new tab</Item>
        <Separator />
        <Item onClick={() => handleAction("info")} className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20">
          More Info
        </Item>
        <Separator />
        {/* Only show "Put back" if item is directly deleted (has deletedAt) but no deleted ancestors */}
        {deletedAt && !hasDeletedAncestor && (
          <>
            <Item onClick={() => handleAction("restore")} className="text-green-600 focus:text-green-600 focus:bg-green-700/20">
              Put back
            </Item>
            <Separator />
          </>
        )}
        <Item onClick={() => handleAction("delete", deletedAt, hasDeletedAncestor)} className="text-red-600 focus:text-red-600 focus:bg-red-700/20">
          Delete Permanently
        </Item>
      </>
    );
  }

  // For non-deleted items, show full menu
  const commonItems = (
    <>
      <Item onClick={() => handleAction("open")}>Open</Item>
      <Item onClick={() => handleAction("open-new-tab")}>Open in new tab</Item>
      <Item onClick={() => handleAction("rename")}>Rename</Item>
      <Separator />
      <Item onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
        {isPinned ? "Unpin" : "Pin"}
      </Item>
      <Separator />
      <Item onClick={() => handleAction("info")} className="text-blue-600 focus:text-blue-600 focus:bg-blue-700/20">
        More Info
      </Item>
      <Separator />
      <Item onClick={() => handleAction("delete", deletedAt, hasDeletedAncestor)} className="text-red-600 focus:text-red-600 focus:bg-red-700/20">
        Move to Trash
      </Item>
    </>
  );

  if (cardType === "folder") {
    return (
      <>
        <Item onClick={() => handleAction("create-folder")}>Create new folder</Item>
        <Item onClick={() => handleAction("upload-file")}>Upload file</Item>
        <Item onClick={() => handleAction("upload-folder")}>Upload folder</Item>
        <Separator />
        {commonItems}
      </>
    );
  }

  return (
    <>
      <Item onClick={() => handleAction("download")}>Download</Item>
      <Item onClick={() => handleAction("preview")}>Preview</Item>
      <Separator />
      {commonItems}
    </>
  );
});

// Context menu items component
export const ContextMenuItems = React.memo((props: MenuProps) => (
  <MenuItems 
    props={props} 
    itemComponent={ContextMenuItem} 
    separatorComponent={ContextMenuSeparator} 
  />
));

// Dropdown menu items component
export const DropdownMenuItems = React.memo((props: MenuProps) => (
  <MenuItems 
    props={props} 
    itemComponent={DropdownMenuItem} 
    separatorComponent={DropdownMenuSeparator} 
  />
));

export { ContextMenuItems as default };
