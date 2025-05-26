import { create } from 'zustand';

interface DialogState {
  // Create Folder Dialog
  createFolderOpen: boolean;
  createFolderParentId: string | null;
  openCreateFolderDialog: (parentId?: string | null) => void;
  closeCreateFolderDialog: () => void;
  
  // Rename Dialog
  renameDialogOpen: boolean;
  renameItemId: string | null;
  renameItemCardType: "folder" | "document" | null;
  renameItemName: string | null;
  openRenameDialog: (id: string, type: "folder" | "document", name: string) => void;
  closeRenameDialog: () => void;
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

  // Rename Dialog
  renameDialogOpen: false,
  renameItemId: null,
  renameItemCardType: null,
  renameItemName: null,
  openRenameDialog: (id: string, type: "folder" | "document", name: string) => set({
    renameDialogOpen: true,
    renameItemId: id,
    renameItemCardType: type,
    renameItemName: name
  }),
  closeRenameDialog: () => set({
    renameDialogOpen: false,
    renameItemId: null,
    renameItemCardType: null,
    renameItemName: null
  })
}));