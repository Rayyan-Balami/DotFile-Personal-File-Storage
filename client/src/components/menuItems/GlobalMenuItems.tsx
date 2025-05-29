import { useDialogStore } from "@/stores/useDialogStore";
import { useUploadFiles } from "@/api/file/file.query";
import { useUploadStore } from "@/stores/useUploadStore";
import { processDirectoryInput } from "@/utils/uploadUtils";
import React from "react";
import { toast } from "sonner";
import { ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu";
import { useMatches } from "@tanstack/react-router";

// Context menu items component
export const ContextMenuItems = React.memo(({ parentId }: { parentId?: string | null } = {}) => {
  const { openCreateFolderDialog } = useDialogStore();
  const uploadFiles = useUploadFiles();
  const { addUpload, updateUploadProgress, setUploadStatus } = useUploadStore();
  const matches = useMatches();
  
  // Route detection to determine current context
  const trashMatch = matches.find(match => match.routeId.includes('/(user)/trash'));
  const recentMatch = matches.find(match => match.routeId.includes('/(user)/recent'));
  
  // Determine if we're in a read-only context (trash or recent)
  const isInTrashContext = !!trashMatch;
  const isInRecentContext = !!recentMatch;
  const isReadOnlyContext = isInTrashContext || isInRecentContext;
  
  // Get dialog functions
  const { openDeleteDialog } = useDialogStore();

  // Handle the action
  const handleAction = (action: string) => {
    if (action === "createFolder") {
      // Pass the parent ID (null for root)
      openCreateFolderDialog(parentId);
    } else if (action === "emptyTrash") {
      // Use existing delete dialog for empty trash confirmation
      // We'll use a special ID to identify this as an empty trash operation
      openDeleteDialog(
        "empty-trash",
        "folder", 
        "all items in trash",
        new Date().toISOString(), // Mark as permanent delete
        true // Force permanent delete UI
      );
    } else if (action === "selectAll") {
      // Handle select all action
      console.log("Select all action");
    } else if (action === "refresh") {
      // Handle refresh action
      window.location.reload();
    } else if (action === "uploadFile") {
      // Create input dynamically for file upload
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      fileInput.accept = '*/*';
      
      fileInput.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const files = target.files;
        
        if (files && files.length > 0) {
          const fileArray = Array.from(files);
          let uploadIds: string[] = [];
          
          try {
            // Create upload entries for tracking
            uploadIds = fileArray.map(file => {
              return addUpload(file, parentId ?? null);
            });

            // Start the upload
            await uploadFiles.mutateAsync({
              files: fileArray,
              folderData: parentId ? { folderId: parentId } : undefined
            });

            // Update all uploads to success
            uploadIds.forEach((id: string) => {
              updateUploadProgress(id, 100);
              setUploadStatus(id, 'success');
            });

            toast.success(`Successfully uploaded ${fileArray.length} file(s)`);
          } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Upload failed. Please try again.");
            
            // Update any pending uploads to error state
            uploadIds.forEach((id: string) => {
              setUploadStatus(id, 'error');
            });
          }
        }
        
        // Clean up
        document.body.removeChild(fileInput);
      };
      
      document.body.appendChild(fileInput);
      fileInput.click();
    } else if (action === "uploadFolder") {
      // Create input dynamically for folder upload
      const folderInput = document.createElement('input');
      folderInput.type = 'file';
      folderInput.multiple = true;
      folderInput.style.display = 'none';
      folderInput.setAttribute('webkitdirectory', '');
      
      folderInput.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        let uploadIds: string[] = [];
        
        try {
          // Process the directory input and create zip files
          const zipFiles = await processDirectoryInput(target);
          
          if (zipFiles.length === 0) {
            toast.error("No files found in the selected folder");
            return;
          }

          // Create upload entries for tracking
          uploadIds = zipFiles.map(file => {
            return addUpload({ name: file.name, size: file.size, isFolder: true }, parentId ?? null);
          });

          // Start the upload
          await uploadFiles.mutateAsync({
            files: zipFiles,
            folderData: parentId ? { folderId: parentId } : undefined
          });

          // Update all uploads to success
          uploadIds.forEach((id: string) => {
            updateUploadProgress(id, 100);
            setUploadStatus(id, 'success');
          });

          toast.success(`Successfully uploaded ${zipFiles.length} folder(s)`);
        } catch (error) {
          console.error("Folder upload failed:", error);
          toast.error("Folder upload failed. Please try again.");
          
          // Update any pending uploads to error state
          uploadIds.forEach((id: string) => {
            setUploadStatus(id, 'error');
          });
        }
        
        // Clean up
        document.body.removeChild(folderInput);
      };
      
      document.body.appendChild(folderInput);
      folderInput.click();
    }
  };
  
  return (
    <>
      {/* Only show file/folder creation and upload options in normal contexts */}
      {!isReadOnlyContext && (
        <>
          {/* File Operations */}
          <ContextMenuItem onClick={() => handleAction("createFolder")}>
            Create New Folder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction("uploadFile")}>
            Upload File
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction("uploadFolder")}>
            Upload Folder
          </ContextMenuItem>

          <ContextMenuSeparator />
        </>
      )}

      {/* Trash-specific actions */}
      {isInTrashContext && (
        <>
          <ContextMenuItem 
            onClick={() => handleAction("emptyTrash")}
            className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
          >
            Empty Trash
          </ContextMenuItem>

          <ContextMenuSeparator />
        </>
      )}

      {/* Selection Operations - available in all contexts */}
      <ContextMenuItem onClick={() => handleAction("selectAll")}>
        Select All
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* View Operations - available in all contexts */}
      <ContextMenuItem onClick={() => handleAction("refresh")}>
        Refresh
      </ContextMenuItem>
    </>
  );
});

ContextMenuItems.displayName = "ContextMenuItems";

// Named exports for better code splitting
export default ContextMenuItems;