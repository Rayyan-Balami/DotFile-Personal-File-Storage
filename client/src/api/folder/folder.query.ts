import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import folderApi from "./folder.api";
import { CreateFolderDto, UpdateFolderDto } from "@/types/folder.dto";

// Query keys
export const FOLDER_KEYS = {
  all: ["folders"] as const,
  contents: (folderId?: string) => 
    folderId ? [...FOLDER_KEYS.all, "contents", folderId] : [...FOLDER_KEYS.all, "root-contents"],
  detail: (id: string) => [...FOLDER_KEYS.all, id] as const,
};

/**
 * Hook to get contents of root folder
 */
export const useRootContents = () =>
  useQuery({
    queryKey: FOLDER_KEYS.contents(),
    queryFn: () => folderApi.getRootContents().then((res) => res.data),
  });

/**
 * Hook to get contents of a specific folder
 */
export const useFolderContents = (folderId: string) =>
  useQuery({
    queryKey: FOLDER_KEYS.contents(folderId),
    queryFn: () => folderApi.getFolderContents(folderId).then((res) => res.data),
    enabled: !!folderId,
  });

/**
 * Hook to create a new folder
 */
export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateFolderDto) => 
      folderApi.createFolder(data).then((res) => res.data),
    onSuccess: (_, variables) => {
      // If folder has a parent, invalidate that parent's contents
      if (variables.parent) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(variables.parent),
        });
      } else {
        // Otherwise invalidate root contents
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(),
        });
      }
    },
  });
};

/**
 * Hook to update folder properties
 */
export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: string, data: UpdateFolderDto }) => 
      folderApi.updateFolder(folderId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      // Invalidate the current folder and its contents
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.detail(variables.folderId),
      });
      
      // If parent changed, invalidate both old and new parent contents
      if (variables.data.parent !== undefined) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.all,
        });
      }
    },
  });
};

/**
 * Hook to delete a folder
 */
export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderId: string) => 
      folderApi.deleteFolder(folderId).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all folder queries since folder structure may have changed
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to rename a folder
 */
export const useRenameFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderId, newName }: { folderId: string; newName: string }) => 
      folderApi.renameFolder(folderId, { newName }).then((res) => res.data),
    onSuccess: (_, variables) => {
      // Invalidate the specific folder query
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.detail(variables.folderId),
      });
      
      // Invalidate parent folder contents to reflect the renamed folder
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to move a folder to a different parent
 */
export const useMoveFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => 
      folderApi.moveFolder(folderId, { newParentId }).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all folder contents as the folder structure has changed
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};