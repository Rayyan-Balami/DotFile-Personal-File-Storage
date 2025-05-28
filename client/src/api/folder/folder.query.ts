import { CreateFolderDto, MoveFolderDto, RenameFolderDto, UpdateFolderDto } from "@/types/folder.dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import folderApi from "./folder.api";

// Query keys
export const FOLDER_KEYS = {
  all: ["folders"] as const,
  trash: ["folders", "trash"] as const,
  pins: (offset?: number, limit?: number) => 
    ["folders", "pins", { offset, limit }] as const,
  contents: (folderId?: string) => 
    folderId ? [...FOLDER_KEYS.all, "contents", folderId] : [...FOLDER_KEYS.all, "root-contents"],
  detail: (id: string) => [...FOLDER_KEYS.all, id] as const,
};

// Raw query function for use in loaders
export const getFolderContents = (folderId: string) => 
  folderApi.getFolderContents(folderId).then((res) => res.data);

/**
 * Hook to get contents of root folder
 */
export const useRootContents = () =>
  useQuery({
    queryKey: FOLDER_KEYS.contents(),
    queryFn: () => folderApi.getRootContents().then((res) => res.data),
  });

/**
 * Hook to get folder contents
 */
export const useFolderContents = (folderId?: string, options?: { includeDeleted?: boolean }) =>
  useQuery({
    queryKey: folderId ? FOLDER_KEYS.contents(folderId) : FOLDER_KEYS.contents(),
    queryFn: () => 
      folderId 
        ? folderApi.getFolderContents(folderId, options).then((res) => res.data)
        : folderApi.getRootContents().then((res) => res.data),
  });

/**
 * Hook to get folder by ID
 */
export const useFolderById = (folderId: string) =>
  useQuery({
    queryKey: FOLDER_KEYS.detail(folderId),
    queryFn: () => folderApi.getFolderById(folderId).then((res) => res.data),
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
 * Hook to get pinned contents with pagination
 */
export const usePinContents = (offset: number = 0, limit: number = 10) =>
  useQuery({
    queryKey: FOLDER_KEYS.pins(offset, limit),
    queryFn: () => folderApi.getPinContents(offset, limit).then((res) => res.data),
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
      // Invalidate all folder queries to ensure complete UI update
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });

      // Also invalidate specific folder contents
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(),
      });

      if (variables.parent) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(variables.parent),
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
      // Invalidate the specific folder's details
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.detail(variables.folderId),
      });
      
      // Invalidate the folder's contents
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(variables.folderId),
      });

      // Invalidate parent folder's contents if it exists
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });

      // Invalidate any folder that might contain this folder
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(),
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

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const { data } = await folderApi.permanentDelete(folderId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}