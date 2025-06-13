import fileApi from "@/api/file/file.api";
import { FOLDER_KEYS } from "@/api/folder/folder.query";
import { useDialogStore } from "@/stores/useDialogStore";
import { useUploadStore } from "@/stores/useUploadStore";
import { MoveFileDto, RenameFileDto, UpdateFileDto } from "@/types/file.dto";
import { logger } from "@/utils/logger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query keys
export const FILE_KEYS = {
  all: ["files"] as const,
  detail: (id: string) => [...FILE_KEYS.all, id] as const,
  list: (params?: { folderId?: string; includeDeleted?: boolean }) =>
    [...FILE_KEYS.all, params] as const,
  recent: ["files", "recent"] as const,
};

/**
 * Hook to list user files, optionally filtered by folder
 */
export const useFiles = (params?: {
  folderId?: string;
  includeDeleted?: boolean;
}) =>
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
  const { setUploadController, setUploadStatus } = useUploadStore();
  const { openDuplicateDialog } = useDialogStore();

  return useMutation({
    mutationFn: async ({
      files,
      folderData,
      onProgress,
      uploadId,
      duplicateAction,
    }: {
      files: File[];
      folderData?: { folderId?: string };
      onProgress?: (progress: number) => void;
      uploadId: string;
      duplicateAction?: "replace" | "keepBoth";
    }) => {
      // Create abort controller for this upload
      const controller = new AbortController();

      // Store the controller in the upload store
      setUploadController(uploadId, controller);

      try {
        const response = await fileApi.uploadFiles(
          files,
          folderData,
          onProgress,
          controller.signal,
          duplicateAction
        );
        return response.data;
      } catch (error: any) {
        logger.info("🚨 Upload error:", error);
        // Check if this was an abort error
        if (
          error instanceof Error &&
          (error.name === "AbortError" || error.name === "CanceledError")
        ) {
          logger.info("🛑 Upload was cancelled");
          // Set status to cancelled
          setUploadStatus(uploadId, "cancelled");
          // Re-throw as cancelled error
          throw new Error("Upload cancelled");
        }

        // Handle duplicate file conflict
        if (error.response?.status === 409) {
          // Convert to promise to handle dialog action
          return new Promise((resolve, reject) => {
            const fileName = files[0]?.name || "file";
            const fileType = fileName.endsWith(".zip") ? "folder" : "file";

            openDuplicateDialog(fileName, fileType, (action) => {
              // Retry upload with duplicate action
              fileApi
                .uploadFiles(
                  files,
                  folderData,
                  onProgress,
                  controller.signal,
                  action
                )
                .then((response) => {
                  resolve(response.data);
                })
                .catch(reject)
                .finally(() => {
                  // Always close the dialog, regardless of success or failure
                  useDialogStore.getState().closeDuplicateDialog();
                });
            });
          });
        }

        // For other errors, set error status
        logger.info("❌ Setting error status");
        setUploadStatus(uploadId, "error");
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      logger.info("🚀 File Upload Success - Starting cache invalidation");

      // Invalidate all folder queries to ensure UI updates with new folders/files
      queryClient.invalidateQueries({
        queryKey: FOLDER_KEYS.all,
      });
      logger.info("📂 Invalidated folder queries");

      // If files were uploaded to a specific folder, also invalidate that folder's contents
      if (variables.folderData?.folderId) {
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(variables.folderData.folderId),
        });
        logger.info("📁 Invalidated specific folder contents");
      } else {
        // Otherwise invalidate root contents
        queryClient.invalidateQueries({
          queryKey: FOLDER_KEYS.contents(),
        });
        logger.info("📁 Invalidated root folder contents");
      }

      // Refresh user data to update storage usage
      logger.info("🔄 Invalidating currentUser query");
      queryClient.invalidateQueries({
        queryKey: ["currentUser"],
      });

      // Force an immediate refetch of current user data
      logger.info("🔄 Forcing currentUser refetch");
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
    mutationFn: ({ fileId, data }: { fileId: string; data: UpdateFileDto }) =>
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
    mutationFn: ({ fileId, data }: { fileId: string; data: RenameFileDto }) =>
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
    mutationFn: ({ fileId, data }: { fileId: string; data: MoveFileDto }) =>
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
    queryKey: [...FILE_KEYS.detail(fileId), "view"],
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
    mutationFn: async ({
      fileId,
      fallbackFilename,
    }: {
      fileId: string;
      fallbackFilename?: string;
    }) => {
      const response = await fileApi.downloadFile(fileId);
      const blob = response.data;

      // Get filename from Content-Disposition header or use fallback
      const contentDisposition = response.headers["content-disposition"];
      let filename = fallbackFilename || `file_${fileId}`;

      if (contentDisposition) {
        // First try to extract UTF-8 encoded filename
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (utf8Match) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Fallback to regular filename extraction
          const regularMatch = contentDisposition.match(/filename=([^;]+)/);
          if (regularMatch) {
            filename = regularMatch[1].replace(/['"]/g, "");
          }
        }
      }

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    },
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
