import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fileApi from "./file.api";
import { UpdateFileDto } from "@/types/file.dto";
import { FOLDER_KEYS } from "../folder/folder.query";

// Query keys
export const FILE_KEYS = {
  all: ["files"] as const,
  detail: (id: string) => [...FILE_KEYS.all, id] as const,
};

/**
 * Hook to get file details by ID
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
    mutationFn: ({ 
      files, 
      folderId, 
      workspaceId 
    }: { 
      files: File[], 
      folderId?: string, 
      workspaceId?: string 
    }) => fileApi.uploadFiles(files, { folderId, workspaceId }).then((res) => res.data),
    
    onSuccess: (_, variables) => {
      // Invalidate the folder contents query to reflect new files
      if (variables.folderId) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(variables.folderId),
        });
      } else {
        // If no folder specified, invalidate root folder contents
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(),
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
      // Invalidate the specific file query
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.detail(variables.fileId),
      });
      
      // If folder changed, invalidate folder contents
      if (variables.data.folder !== undefined) {
        // Invalidate all folder contents as we need to update both old and new folder
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
    mutationFn: (fileId: string) => fileApi.deleteFile(fileId).then((res) => res.data),
    
    onSuccess: () => {
      // Invalidate folder contents as we don't know which folder the file was in
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
    mutationFn: ({ fileId, newName }: { fileId: string; newName: string }) => 
      fileApi.renameFile(fileId, { newName }).then((res) => res.data),
      
    onSuccess: (_, variables) => {
      // Invalidate the specific file query
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.detail(variables.fileId),
      });
      
      // Invalidate folder contents to reflect the renamed file
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to move a file to a different folder
 */
export const useMoveFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, newParentId }: { fileId: string; newParentId: string | null }) => 
      fileApi.moveFile(fileId, { newParentId }).then((res) => res.data),
      
    onSuccess: () => {
      // Invalidate all folder contents as both source and destination folders need updates
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};
