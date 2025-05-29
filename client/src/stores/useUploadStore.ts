import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  isFolder: boolean;
  status: 'creating-zip' | 'uploading' | 'success' | 'error' | 'cancelled';
  progress: number;
  file?: File;
  parentId: string | null;
  abortController?: AbortController;
}

interface UploadStore {
  uploads: UploadItem[];
  addUpload: (file: File | { name: string, size: number, isFolder: true }, parentId: string | null) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  setUploadStatus: (id: string, status: 'creating-zip' | 'uploading' | 'success' | 'error' | 'cancelled') => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  setUploadController: (id: string, controller: AbortController) => void;
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
    console.log('🔄 Setting upload status:', { id, status });
    set(state => ({
      uploads: state.uploads.map(upload => 
        upload.id === id ? { ...upload, status } : upload
      )
    }));
  },

  setUploadController: (id, controller) => {
    set(state => ({
      uploads: state.uploads.map(upload => 
        upload.id === id ? { ...upload, abortController: controller } : upload
      )
    }));
  },
  
  cancelUpload: (id) => {
    console.log('❌ Cancelling upload:', id);
    set(state => {
      // Find the upload to cancel
      const upload = state.uploads.find(u => u.id === id);
      console.log('📦 Current upload state:', upload);
      
      // Abort the request if there's an abort controller
      if (upload?.abortController) {
        console.log('🛑 Aborting request');
        upload.abortController.abort();
      }
      
      // Update status to cancelled instead of removing
      return {
        uploads: state.uploads.map(upload => {
          if (upload.id === id) {
            console.log('📝 Updating upload status to cancelled');
            return { ...upload, status: 'cancelled' };
          }
          return upload;
        })
      };
    });
  },
  
  clearCompleted: () => {
    set(state => ({
      uploads: state.uploads.filter(upload => 
        upload.status === 'uploading' || upload.status === 'creating-zip'
      )
    }));
  }
}));