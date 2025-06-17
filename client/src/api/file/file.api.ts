import API from "@/lib/axios";
import { useLogStore } from "@/stores/useLogStore";
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
  viewFile: async (
    fileId: string,
    responseType: "arraybuffer" | "blob" | "stream" = "arraybuffer"
  ) => {
    try {
      const response = await API.get(`/files/${fileId}/view`, {
        responseType,
        headers: {
          Accept: "*/*", // Accept any content type
        },
      });
      
      // Extract logs from headers and add them to store if present
      const logsHeader = response.headers['x-algorithm-logs'];
      if (logsHeader) {
        try {
          const parsedLogs = JSON.parse(logsHeader);
          console.log(`[file.api] Found ${parsedLogs.length} logs in X-Algorithm-Logs header for view`);
          
          const { addLogs } = useLogStore.getState();
          addLogs(parsedLogs);
        } catch (e) {
          console.error('[file.api] Failed to parse logs header:', e);
        }
      }
      
      // Extract logs endpoint if available
      const logsAvailable = response.headers['x-logs-available'];
      const logsEndpoint = response.headers['x-logs-endpoint'];
      if (logsAvailable === 'true' && logsEndpoint) {
        console.log(`[file.api] Logs available at endpoint: ${logsEndpoint}`);
        // Fetch logs from the endpoint
        try {
          const logsResponse = await API.get(logsEndpoint);
          if (logsResponse.data && logsResponse.data.logs) {
            const { addLogs } = useLogStore.getState();
            addLogs(logsResponse.data.logs);
            console.log(`[file.api] Retrieved ${logsResponse.data.logs.length} logs from endpoint`);
          }
        } catch (e) {
          console.error('[file.api] Failed to fetch logs from endpoint:', e);
        }
      }
      
      return response;
    } catch (error) {
      // Log view error and add to log store
      console.error(`[file.api] Error viewing file ${fileId}:`, error);
      useLogStore.getState().addLog({
        timestamp: new Date().toISOString(),
        component: 'FileAPI',
        level: 'ERROR',
        message: `File view error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Rethrow to allow the caller to handle it
      throw error;
    }
  },

  // Get direct URL for streaming content like videos or PDFs
  getFileUrl: (fileId: string) => {
    // Initiate a background log fetch without affecting the URL return
    setTimeout(async () => {
      try {
        // Make a separate request just to get the logs
        const logResponse = await API.get(`/files/${fileId}/view`, {
          params: { logs: 'true' },
          headers: { Accept: 'application/json' }
        });
        
        if (logResponse.data && logResponse.data.logs) {
          const { addLogs } = useLogStore.getState();
          addLogs(logResponse.data.logs);
          console.log(`[file.api] Retrieved ${logResponse.data.logs.length} logs for preview via separate request`);
        }
      } catch (e) {
        console.error('[file.api] Failed to fetch logs for preview:', e);
        // Add a log entry about the failure
        useLogStore.getState().addLog({
          timestamp: new Date().toISOString(),
          component: 'FileAPI',
          level: 'ERROR',
          message: `Failed to fetch logs for file ${fileId}: ${e instanceof Error ? e.message : String(e)}`
        });
      }
    }, 0);
    
    // Return the URL as before
    return `${API.defaults.baseURL}/files/${fileId}/view`;
  },

  // Download file
  downloadFile: async (fileId: string) => {
    let response;
    try {
      // Use axios directly to get raw response with headers
      response = await API.get(`/files/${fileId}/download`, {
        responseType: "blob",
      });

      // Extract logs from headers and add them to store if present
      const logsHeader = response.headers["x-algorithm-logs"];
      if (logsHeader) {
        try {
          const parsedLogs = JSON.parse(logsHeader);
          console.log(
            `[file.api] Found ${parsedLogs.length} logs in X-Algorithm-Logs header for download`
          );

          const { addLogs } = useLogStore.getState();
          addLogs(parsedLogs);
        } catch (e) {
          console.error("[file.api] Failed to parse logs header:", e);
        }
      }
      
      // Extract logs endpoint if available
      const logsAvailable = response.headers["x-logs-available"];
      const logsEndpoint = response.headers["x-logs-endpoint"];
      if (logsAvailable === "true" && logsEndpoint) {
        console.log(`[file.api] Logs available at endpoint: ${logsEndpoint}`);
        // Fetch logs from the endpoint
        try {
          const logsResponse = await API.get(logsEndpoint);
          if (logsResponse.data && logsResponse.data.logs) {
            const { addLogs } = useLogStore.getState();
            addLogs(logsResponse.data.logs);
            console.log(
              `[file.api] Retrieved ${logsResponse.data.logs.length} logs from endpoint`
            );
          }
        } catch (e) {
          console.error("[file.api] Failed to fetch logs from endpoint:", e);
        }
      }
      
      return response;
      
    } catch (error) {
      // Log download error and add to log store
      console.error(`[file.api] Error downloading file ${fileId}:`, error);
      useLogStore.getState().addLog({
        timestamp: new Date().toISOString(),
        component: 'FileAPI',
        level: 'ERROR',
        message: `File download error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Rethrow to allow the caller to handle it
      throw error;
    }
  },

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
