import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fileApi from "./file.api";
import { MoveFileDto, RenameFileDto, UpdateFileDto } from "@/types/file.dto";
import { FOLDER_KEYS } from "../folder/folder.query";

// Query keys
export const FILE_KEYS = {
  all: ["files"] as const,
  detail: (id: string) => [...FILE_KEYS.all, id] as const,
};

/**
 * Hook to get file by ID
 */
export const useFile = (fileId: string) =>
  useQuery({
    queryKey: FILE_KEYS.detail(fileId),
    queryFn: () => fileApi.getFileById(fileId).then((res) => res.data),
    enabled: !!fileId,
  });

/**
 * Hook to upload files
 */
export const useUploadFiles = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ files, folderData }: { 
      files: File[], 
      folderData?: { folderId?: string; workspaceId?: string } 
    }) => 
      fileApi.uploadFiles(files, folderData).then((res) => res.data),
    onSuccess: (_, variables) => {
      // If files were uploaded to a folder, invalidate that folder's contents
      if (variables.folderData?.folderId) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(variables.folderData.folderId),
        });
      } else {
        // Otherwise invalidate root contents
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(),
        });
      }
      
      // If files were uploaded to a workspace, you might want to invalidate workspace queries too
      if (variables.folderData?.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ["workspaces", variables.folderData.workspaceId],
        });
      }
    },
  });
};

/**
 * Hook to update file properties
 */
export const useUpdateFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string, data: UpdateFileDto }) => 
      fileApi.updateFile(fileId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.detail(variables.fileId),
      });
      
      // If folder changed, invalidate folder contents
      if (variables.data.folder !== undefined) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.all,
        });
      }
    },
  });
};

/**
 * Hook to delete a file
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileId: string) => 
      fileApi.deleteFile(fileId).then((res) => res.data),
    onSuccess: () => {
      // Invalidate folder contents as files structure may have changed
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to rename a file
 */
export const useRenameFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string, data: RenameFileDto }) => 
      fileApi.renameFile(fileId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.detail(variables.fileId),
      });
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to move a file
 */
export const useMoveFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string, data: MoveFileDto }) => 
      fileApi.moveFile(fileId, data).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all folder contents as the file location has changed
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};
