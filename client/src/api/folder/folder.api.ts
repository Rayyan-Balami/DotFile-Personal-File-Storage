import API from "@/lib/axios";
import {
  CreateFolderDto,
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto,
} from "@/types/folder.dto";

/**
 * Folder API functions for authenticated users
 */
const folderApi = {
  // Create a new folder
  createFolder: (data: CreateFolderDto) => API.post("/folders", data),

  // Get root folder contents
  getRootContents: () => API.get("/folders/contents"),

  // Get contents of a specific folder by ID
  getFolderContents: (
    folderId: string,
    options?: { includeDeleted?: boolean }
  ) => API.get(`/folders/contents/${folderId}`, { params: options }),

  // Get folder by ID
  getFolderById: (folderId: string) => API.get(`/folders/${folderId}`),

  // Update a folder's properties
  updateFolder: (folderId: string, data: UpdateFolderDto) =>
    API.patch(`/folders/${folderId}`, data),

  // Rename a folder
  renameFolder: (folderId: string, data: RenameFolderDto) =>
    API.patch(`/folders/${folderId}/rename`, data),

  // Move a folder to a different parent
  moveFolder: (folderId: string, data: MoveFolderDto) =>
    API.patch(`/folders/${folderId}/move`, data),

  // Move to trash (soft delete)
  moveToTrash: (folderId: string) => API.delete(`/folders/${folderId}`),

  // Permanently delete folder
  permanentDelete: (folderId: string) =>
    API.delete(`/folders/${folderId}/permanent`),

  // Restore folder from trash
  restoreFolder: (folderId: string) => API.post(`/folders/${folderId}/restore`),

  // Get trash contents
  getTrashContents: () => API.get("/folders/trash/contents"),

  // Get pinned contents with pagination
  getPinContents: (offset: number = 0, limit: number = 10) =>
    API.get("/folders/pins/contents", { params: { offset, limit } }),

  // Search contents
  searchContents: (params: {
    query?: string;
    itemType?: string;
    fileTypes?: string[];
    location?: string;
    isPinned?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    // Convert fileTypes array to comma-separated string for query params
    const searchParams = {
      ...params,
      fileTypes: params.fileTypes?.join(',')
    };
    return API.get("/folders/search/contents", { params: searchParams });
  },

  // Empty trash (delete all trashed folders)
  emptyTrash: () => API.post("/folders/trash/empty"),
};

export default folderApi;
