import { create } from 'zustand';

interface DialogState {
  // Create Folder Dialog
  createFolderOpen: boolean;
  createFolderParentId: string | null;
  openCreateFolderDialog: (parentId?: string | null) => void;
  closeCreateFolderDialog: () => void;
  
  // You can add more dialogs here in the future
}

export const useDialogStore = create<DialogState>((set) => ({
  // Create Folder Dialog
  createFolderOpen: false,
  createFolderParentId: null,
  openCreateFolderDialog: (parentId = null) => set({ 
    createFolderOpen: true, 
    createFolderParentId: parentId 
  }),
  closeCreateFolderDialog: () => set({ 
    createFolderOpen: false 
  }),
}));