import API from "@/lib/axios";
import { MoveFileDto, RenameFileDto, UpdateFileDto } from "@/types/file.dto";

/**
 * File API functions for authenticated users
 */
const fileApi = {
  // Upload files to the server
  uploadFiles: (
    files: File[],
    folderData?: { folderId?: string },
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal,
    duplicateAction?: "replace" | "keepBoth"
  ) => {
    const formData = new FormData();

    // Append each file to the form data
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Add folder information if provided
    if (folderData?.folderId) {
      formData.append("folderId", folderData.folderId);
    }

    // Add duplicate action if provided
    if (duplicateAction) {
      formData.append("duplicateAction", duplicateAction);
    }

    return API.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal: abortSignal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress?.(percentCompleted);
        }
      },
    });
  },

  // Get all user files
  getUserFiles: (params?: { folderId?: string; includeDeleted?: boolean }) =>
    API.get("/files", { params }),

  // Get a file by ID
  getFileById: (fileId: string) => API.get(`/files/${fileId}`),

  // View file content
  viewFile: (
    fileId: string,
    responseType: "arraybuffer" | "blob" | "stream" = "arraybuffer"
  ) =>
    API.get(`/files/${fileId}/view`, {
      responseType,
      headers: {
        Accept: "*/*", // Accept any content type
      },
    }),

  // Get direct URL for streaming content like videos or PDFs
  getFileUrl: (fileId: string) =>
    `${API.defaults.baseURL}/files/${fileId}/view`,

  // Download file
  downloadFile: (fileId: string) => API.get(`/files/${fileId}/download`),

  // Update a file's properties
  updateFile: (fileId: string, data: UpdateFileDto) =>
    API.patch(`/files/${fileId}`, data),

  // Move to trash (soft delete)
  moveToTrash: (fileId: string) => API.delete(`/files/${fileId}`),

  // Permanently delete file
  permanentDelete: (fileId: string) => API.delete(`/files/${fileId}/permanent`),

  // Restore file from trash
  restoreFile: (fileId: string) => API.post(`/files/${fileId}/restore`),

  // Rename a file
  renameFile: (fileId: string, data: RenameFileDto) =>
    API.post(`/files/${fileId}/rename`, data),

  // Move a file to a different folder
  moveFile: (fileId: string, data: MoveFileDto) =>
    API.post(`/files/${fileId}/move`, data),

  // Get recent files
  getRecentFiles: () => API.get("/files/recent"),
};

export default fileApi;
