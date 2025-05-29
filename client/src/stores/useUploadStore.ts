import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  isFolder: boolean;
  status: 'creating-zip' | 'uploading' | 'success' | 'error';
  progress: number;
  file?: File;
  parentId: string | null;
}

interface UploadStore {
  uploads: UploadItem[];
  addUpload: (file: File | { name: string, size: number, isFolder: true }, parentId: string | null) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  setUploadStatus: (id: string, status: 'creating-zip' | 'uploading' | 'success' | 'error') => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  uploads: [],
  
  addUpload: (fileOrFolder, parentId) => {
    const id = nanoid();
    const isFolder = 'isFolder' in fileOrFolder && fileOrFolder.isFolder;
    
    const newUpload: UploadItem = {
      id,
      fileName: fileOrFolder.name,
      fileSize: fileOrFolder.size,
      isFolder,
      status: isFolder ? 'creating-zip' : 'uploading',
      progress: 0,
      file: isFolder ? undefined : fileOrFolder as File,
      parentId
    };
    
    set(state => ({
      uploads: [...state.uploads, newUpload]
    }));
    
    return id;
  },
  
  updateUploadProgress: (id, progress) => {
    set(state => ({
      uploads: state.uploads.map(upload => 
        upload.id === id ? { ...upload, progress } : upload
      )
    }));
  },
  
  setUploadStatus: (id, status) => {
    set(state => ({
      uploads: state.uploads.map(upload => 
        upload.id === id ? { ...upload, status } : upload
      )
    }));
  },
  
  cancelUpload: (id) => {
    set(state => ({
      uploads: state.uploads.filter(upload => upload.id !== id)
    }));
  },
  
  clearCompleted: () => {
    set(state => ({
      uploads: state.uploads.filter(upload => 
        upload.status === 'uploading'
      )
    }));
  }
}));