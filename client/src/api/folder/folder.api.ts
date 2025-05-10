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

  // Update a folder's properties
  updateFolder: (folderId: string, data: UpdateFolderDto) => 
    API.patch(`/folders/${folderId}`, data),

  // Rename a folder
  renameFolder: (folderId: string, data: RenameFolderDto) => 
    API.post(`/folders/${folderId}/rename`, data),

  // Move a folder to a different parent
  moveFolder: (folderId: string, data: MoveFolderDto) => 
    API.post(`/folders/${folderId}/move`, data),

  // Delete a folder by ID
  deleteFolder: (folderId: string) => 
    API.delete(`/folders/${folderId}`)
};

export default folderApi;