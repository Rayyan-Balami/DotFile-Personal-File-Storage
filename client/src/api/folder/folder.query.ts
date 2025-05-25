import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import folderApi from "./folder.api";
import { CreateFolderDto, MoveFolderDto, RenameFolderDto, UpdateFolderDto } from "@/types/folder.dto";

// Query keys
export const FOLDER_KEYS = {
  all: ["folders"] as const,
  trash: ["folders", "trash"] as const,
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
 * Hook to get folder by ID
 */
export const useFolder = (folderId: string) =>
  useQuery({
    queryKey: FOLDER_KEYS.detail(folderId),
    queryFn: () => folderApi.getFolderById(folderId).then((res) => res.data),
    enabled: !!folderId,
  });

/**
 * Hook to get trash contents
 */
export const useTrashContents = () =>
  useQuery({
    queryKey: FOLDER_KEYS.trash,
    queryFn: () => folderApi.getTrashContents().then((res) => res.data),
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
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.detail(variables.folderId),
      });
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(variables.folderId),
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
    mutationFn: ({ folderId, data }: { folderId: string, data: RenameFolderDto }) => 
      folderApi.renameFolder(folderId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.detail(variables.folderId),
      });
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(variables.folderId),
      });
    },
  });
};

/**
 * Hook to move a folder
 */
export const useMoveFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderId, data }: { folderId: string, data: MoveFolderDto }) => 
      folderApi.moveFolder(folderId, data).then((res) => res.data),
    onSuccess: () => {
      // Since folder structure changed, invalidate all folder queries
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
    },
  });
};

/**
 * Hook to move folder to trash
 */
export const useMoveToTrash = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderId: string) => 
      folderApi.moveToTrash(folderId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.trash,
      });
    },
  });
};

/**
 * Hook to permanently delete a folder
 */
export const usePermanentDelete = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderId: string) => 
      folderApi.permanentDelete(folderId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.trash,
      });
    },
  });
};

/**
 * Hook to restore a folder from trash
 */
export const useRestoreFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderId: string) => 
      folderApi.restoreFolder(folderId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.trash,
      });
    },
  });
};

/**
 * Hook to empty trash
 */
export const useEmptyTrash = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => 
      folderApi.emptyTrash().then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.trash,
      });
    },
  });
};