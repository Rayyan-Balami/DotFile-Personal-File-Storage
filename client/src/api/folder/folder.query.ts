import folderApi from "@/api/folder/folder.api";
import {
  CreateFolderDto,
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto,
} from "@/types/folder.dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query keys
export const FOLDER_KEYS = {
  all: ["folders"] as const,
  trash: ["folders", "trash"] as const,
  pins: (offset?: number, limit?: number) =>
    ["folders", "pins", { offset, limit }] as const,
  contents: (folderId?: string) =>
    folderId
      ? [...FOLDER_KEYS.all, "contents", folderId]
      : [...FOLDER_KEYS.all, "root-contents"],
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
export const useFolderContents = (
  folderId?: string,
  options?: { includeDeleted?: boolean }
) =>
  useQuery({
    queryKey: folderId
      ? FOLDER_KEYS.contents(folderId)
      : FOLDER_KEYS.contents(),
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
    queryFn: () =>
      folderApi.getPinContents(offset, limit).then((res) => res.data),
  });

/**
 * Hook to search contents
 */
export const useSearchContents = (params: {
  query?: string;
  itemType?: string;
  fileTypes?: string[];
  isPinned?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) =>
  useQuery({
    queryKey: ["folders", "search", params],
    queryFn: () => folderApi.searchContents(params).then((res) => res.data),
    enabled: !!(
      params.query ||
      params.itemType !== "all" ||
      params.fileTypes?.length ||
      params.isPinned !== undefined ||
      params.dateFrom ||
      params.dateTo
    ),
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
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string;
      data: UpdateFolderDto;
    }) => folderApi.updateFolder(folderId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      // Invalidate the specific folder's details
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.detail(variables.folderId),
      });

      // Invalidate the folder's contents
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(variables.folderId),
      });

      // If isPinned property was updated, invalidate pins cache
      if (variables.data.isPinned !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ["folders", "pins"],
        });
      }

      // Always invalidate all folder-related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });

      // Invalidate root contents specifically
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.contents(),
      });

      // Invalidate any parent folder contents that might contain this folder
      queryClient.invalidateQueries({
        queryKey: ["folders", "contents"],
      });

      // Also invalidate pins queries in case this folder is pinned
      queryClient.invalidateQueries({
        queryKey: ["folders", "pins"],
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
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string;
      data: RenameFolderDto;
    }) => folderApi.renameFolder(folderId, data).then((res) => res.data),
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
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string;
      data: MoveFolderDto;
    }) => folderApi.moveFolder(folderId, data).then((res) => res.data),
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
      // Refresh user data to update storage usage
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
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
    mutationFn: () => folderApi.emptyTrash().then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.trash,
      });
      // Refresh user data to update storage usage
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
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
      // Refresh user data to update storage usage
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });
    },
  });
}
