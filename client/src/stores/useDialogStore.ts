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

  // Duplicate Item Dialog
  duplicateDialogOpen: boolean;
  duplicateItemName: string | null;
  duplicateItemType: "folder" | "file" | null;
  duplicateItemAction: ((action: "replace" | "keepBoth") => void) | null;
  openDuplicateDialog: (name: string, type: "folder" | "file", action: (action: "replace" | "keepBoth") => void) => void;
  closeDuplicateDialog: () => void;

  // Delete Dialog
  deleteDialogOpen: boolean;
  deleteItemId: string | null;
  deleteItemType: "folder" | "document" | null;
  deleteItemName: string | null;
  deleteItemDeletedAt: string | null;
  deleteItemHasDeletedAncestor: boolean;
  deleteItemIds: string[];
  deleteItemNames: string[];
  openDeleteDialog: (id: string | string[], type: "folder" | "document", name: string | string[], deletedAt?: string | null, hasDeletedAncestor?: boolean) => void;
  closeDeleteDialog: () => void;

  // Helper to close all dialogs
  closeAllDialogs: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  // Create Folder Dialog
  createFolderOpen: false,
  createFolderParentId: null,
  openCreateFolderDialog: (parentId = null) => set((state) => ({ 
    ...state,
    createFolderOpen: true, 
    createFolderParentId: parentId,
    renameDialogOpen: false,
    duplicateDialogOpen: false,
    deleteDialogOpen: false
  })),
  closeCreateFolderDialog: () => set((state) => ({ 
    ...state,
    createFolderOpen: false 
  })),

  // Rename Dialog
  renameDialogOpen: false,
  renameItemId: null,
  renameItemCardType: null,
  renameItemName: null,
  openRenameDialog: (id: string, type: "folder" | "document", name: string) => set((state) => ({
    ...state,
    renameDialogOpen: true,
    renameItemId: id,
    renameItemCardType: type,
    renameItemName: name,
    createFolderOpen: false,
    duplicateDialogOpen: false,
    deleteDialogOpen: false
  })),
  closeRenameDialog: () => set((state) => ({
    ...state,
    renameDialogOpen: false,
    renameItemId: null,
    renameItemCardType: null,
    renameItemName: null
  })),

  // Duplicate Item Dialog
  duplicateDialogOpen: false,
  duplicateItemName: null,
  duplicateItemType: null,
  duplicateItemAction: null,
  openDuplicateDialog: (name: string, type: "folder" | "file", action: (action: "replace" | "keepBoth") => void) => set((state) => ({
    ...state,
    duplicateDialogOpen: true,
    duplicateItemName: name,
    duplicateItemType: type,
    duplicateItemAction: action,
    createFolderOpen: false,
    renameDialogOpen: false,
    deleteDialogOpen: false
  })),
  closeDuplicateDialog: () => set((state) => ({
    ...state,
    duplicateDialogOpen: false,
    duplicateItemName: null,
    duplicateItemType: null,
    duplicateItemAction: null
  })),

  // Delete Dialog
  deleteDialogOpen: false,
  deleteItemId: null,
  deleteItemType: null,
  deleteItemName: null,
  deleteItemDeletedAt: null,
  deleteItemHasDeletedAncestor: false,
  deleteItemIds: [],
  deleteItemNames: [],
  openDeleteDialog: (id: string | string[], type: "folder" | "document", name: string | string[], deletedAt = null, hasDeletedAncestor = false) => set((state) => ({
    ...state,
    deleteDialogOpen: true,
    deleteItemId: Array.isArray(id) ? null : id,
    deleteItemIds: Array.isArray(id) ? id : [],
    deleteItemType: type,
    deleteItemName: Array.isArray(name) ? null : name,
    deleteItemNames: Array.isArray(name) ? name : [],
    deleteItemDeletedAt: deletedAt,
    deleteItemHasDeletedAncestor: hasDeletedAncestor,
    createFolderOpen: false,
    renameDialogOpen: false,
    duplicateDialogOpen: false
  })),
  closeDeleteDialog: () => set((state) => ({
    ...state,
    deleteDialogOpen: false,
    deleteItemId: null,
    deleteItemType: null,
    deleteItemName: null,
    deleteItemDeletedAt: null,
    deleteItemHasDeletedAncestor: false,
    deleteItemIds: [],
    deleteItemNames: []
  })),

  // Helper to close all dialogs
  closeAllDialogs: () => set((state) => ({
    ...state,
    createFolderOpen: false,
    renameDialogOpen: false,
    duplicateDialogOpen: false,
    deleteDialogOpen: false,
    createFolderParentId: null,
    renameItemId: null,
    renameItemCardType: null,
    renameItemName: null,
    duplicateItemName: null,
    duplicateItemType: null,
    duplicateItemAction: null,
    deleteItemId: null,
    deleteItemType: null,
    deleteItemName: null,
    deleteItemDeletedAt: null,
    deleteItemHasDeletedAncestor: false,
    deleteItemIds: [],
    deleteItemNames: []
  }))
}));