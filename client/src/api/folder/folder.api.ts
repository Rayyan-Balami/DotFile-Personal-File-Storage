import API from "@/lib/axios";
import { 
  CreateFolderDto, 
  FolderResponseDto, 
  FolderResponseWithFilesDto, 
  MoveFolderDto,
  RenameFolderDto,
  UpdateFolderDto 
} from "@/types/folder.dto";

/**
 * Folder API functions for authenticated users
 */
const folderApi = {
  // Create a new folder
  createFolder: (data: CreateFolderDto) => 
    API.post("/folders", data),

  // Get root folder contents
  getRootContents: () => 
    API.get("/folders/contents"),

  // Get contents of a specific folder by ID
  getFolderContents: (folderId: string) => 
    API.get(`/folders/contents/${folderId}`),

  // Get folder by ID
  getFolderById: (folderId: string) => 
    API.get(`/folders/${folderId}`),

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
  moveToTrash: (folderId: string) => 
    API.delete(`/folders/${folderId}`),

  // Permanently delete folder
  permanentDelete: (folderId: string) => 
    API.delete(`/folders/${folderId}/permanent`),

  // Restore folder from trash  
  restoreFolder: (folderId: string) => 
    API.post(`/folders/${folderId}/restore`),

  // Get trash contents
  getTrashContents: () => 
    API.get("/folders/trash/contents"),

  // Empty trash (delete all trashed folders)  
  emptyTrash: () => 
    API.post("/folders/trash/empty")
};

export default folderApi;