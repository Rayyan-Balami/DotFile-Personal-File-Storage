import { MoveFileDto, RenameFileDto, UpdateFileDto } from "@/types/file.dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FOLDER_KEYS } from "../folder/folder.query";
import fileApi from "./file.api";

// Query keys
export const FILE_KEYS = {
  all: ["files"] as const,
  detail: (id: string) => [...FILE_KEYS.all, id] as const,
  list: (params?: { folderId?: string, includeDeleted?: boolean }) => 
    [...FILE_KEYS.all, params] as const,
  recent: ["files", "recent"] as const,
};

/**
 * Hook to list user files, optionally filtered by folder
 */
export const useFiles = (params?: { folderId?: string, includeDeleted?: boolean }) =>
  useQuery({
    queryKey: FILE_KEYS.list(params),
    queryFn: () => fileApi.getUserFiles(params).then((res) => res.data),
  });

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
    mutationFn: ({ files, folderData, onProgress }: { 
      files: File[], 
      folderData?: { folderId?: string },
      onProgress?: (progress: number) => void
    }) => 
      fileApi.uploadFiles(files, folderData, onProgress).then((res) => res.data),
    onSuccess: (data, variables) => {
      console.log('🚀 File Upload Success - Starting cache invalidation');
      
      // Invalidate all folder queries to ensure UI updates with new folders/files
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
      console.log('📂 Invalidated folder queries');
      
      // If files were uploaded to a specific folder, also invalidate that folder's contents
      if (variables.folderData?.folderId) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(variables.folderData.folderId),
        });
        console.log('📁 Invalidated specific folder contents');
      } else {
        // Otherwise invalidate root contents
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(),
        });
        console.log('📁 Invalidated root folder contents');
      }
      
      // Refresh user data to update storage usage
      console.log('🔄 Invalidating currentUser query');
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
      
      // Force an immediate refetch of current user data
      console.log('🔄 Forcing currentUser refetch');
      queryClient.refetchQueries({
        queryKey: ["currentUser"],
      });
      
      // If folders were created during upload, force a refetch
      if (data?.folders && Object.keys(data.folders).length > 0) {
        setTimeout(() => {
          queryClient.refetchQueries({
            queryKey: FOLDER_KEYS.all,
          });
        }, 100);
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
      
      // If isPinned property was updated, invalidate pins cache
      if (variables.data.isPinned !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ["folders", "pins"],
        });
      }
      
      // Always invalidate folder contents to update the UI cards
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to move a file to trash
 */
export const useMoveFileToTrash = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileId: string) => 
      fileApi.moveToTrash(fileId).then((res) => res.data),
    onSuccess: () => {
      // Invalidate folder contents as files structure has changed
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
      // Also invalidate trash contents
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.list({ includeDeleted: true }),
      });
    },
  });
};

/**
 * Hook to permanently delete a file
 */
export const usePermanentDeleteFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileId: string) => 
      fileApi.permanentDelete(fileId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.list({ includeDeleted: true }),
      });
      // Refresh user data to update storage usage
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
    },
  });
};

/**
 * Hook to restore a file from trash
 */
export const useRestoreFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileId: string) => 
      fileApi.restoreFile(fileId).then((res) => res.data),
    onSuccess: () => {
      // Invalidate both normal and trash queries
      queryClient.invalidateQueries({
        queryKey: FILE_KEYS.list({ includeDeleted: true }),
      });
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
      // Since folder structure changed, invalidate all folder queries
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to view file content
 */
export const useViewFile = (fileId: string) =>
  useQuery({
    queryKey: [...FILE_KEYS.detail(fileId), 'view'],
    queryFn: async () => {
      const response = await fileApi.viewFile(fileId);
      // Get the raw blob data from the response
      return response.data;
    },
    enabled: !!fileId,
  });

/**
 * Hook to download file
 */
export const useDownloadFile = () => {
  return useMutation({
    mutationFn: (fileId: string) => 
      fileApi.downloadFile(fileId).then((res) => res.data),
  });
};

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { data } = await fileApi.permanentDelete(fileId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      // Refresh user data to update storage usage
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
    },
  });
}

/**
 * Hook to get recent files
 */
export const useRecentFiles = () =>
  useQuery({
    queryKey: FILE_KEYS.recent,
    queryFn: () => fileApi.getRecentFiles().then((res) => res.data),
  });
