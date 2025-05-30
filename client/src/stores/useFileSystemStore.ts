import { produce } from 'immer';
import { create } from 'zustand';
import { DocumentItem, FileSystemItem, FolderItem } from '@/types/folderDocumnet';

interface FileSystemState {
  items: Record<string, FileSystemItem>;
  rootItems: string[]; // IDs of root level items
  forceReadOnly: Record<string, boolean>; // Track read-only state for folders
  
  // Actions
  moveItem: (itemId: string, targetId: string | null) => void;
  addItem: (item: FileSystemItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<FileSystemItem>) => void;
  setFolderReadOnly: (folderId: string, isReadOnly: boolean) => void;
  
  // Helpers
  getChildren: (folderId: string | null) => FileSystemItem[];
  getPath: (itemId: string) => FileSystemItem[];
  getFolderById: (folderId: string) => FolderItem | undefined;
  getItemById: (itemId: string) => FileSystemItem | undefined;
  isFolderReadOnly: (folderId: string) => boolean;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  items: {},
  rootItems: [],
  forceReadOnly: {},
  
  moveItem: (itemId, targetId) => set(produce((state) => {
    const item = state.items[itemId];
    if (!item) return;
    
    // Remove from current parent's root items if it was there
    if ('parent' in item && item.parent === null || 'folder' in item && item.folder === null) {
      state.rootItems = state.rootItems.filter((id: string) => id !== itemId);
    }
    
    // Add to new location
    if (targetId === null) {
      state.rootItems.push(itemId);
      if (item.cardType === 'folder') {
        (item as FolderItem).parent = null;
      } else {
        (item as DocumentItem).folder = null;
      }
    } else {
      const targetItem = state.items[targetId];
      if (targetItem?.cardType === 'folder') {
        if (item.cardType === 'folder') {
          (item as FolderItem).parent = targetId;
        } else {
          (item as DocumentItem).folder = {
            id: targetId,
            name: targetItem.name,
            type: 'folder',
            owner: targetItem.owner,
            color: (targetItem as FolderItem).color,
            parent: (targetItem as FolderItem).parent,
            items: (targetItem as FolderItem).items,
            isPinned: targetItem.isPinned,
            createdAt: targetItem.createdAt,
            updatedAt: targetItem.updatedAt,
            deletedAt: targetItem.deletedAt,
          };
        }
      }
    }
  })),
  
  addItem: (item) => set(produce((state) => {
    state.items[item.id] = item;
    
    const isRootItem = item.cardType === 'folder' ? 
      (item as FolderItem).parent === null : 
      (item as DocumentItem).folder === null;
      
    if (isRootItem && !state.rootItems.includes(item.id)) {
      state.rootItems.push(item.id);
    }
  })),
  
  removeItem: (itemId) => set(produce((state) => {
    const item = state.items[itemId];
    if (!item) return;
    
    // Remove from root items if applicable
    if (state.rootItems.includes(itemId)) {
      state.rootItems = state.rootItems.filter((id: string) => id !== itemId);
    }
    
    delete state.items[itemId];
  })),
  
  updateItem: (itemId, updates) => set(produce((state) => {
    if (state.items[itemId]) {
      state.items[itemId] = { ...state.items[itemId], ...updates };
    }
  })),
  
  setFolderReadOnly: (folderId, isReadOnly) => set(produce((state) => {
    state.forceReadOnly[folderId] = isReadOnly;
  })),

  isFolderReadOnly: (folderId) => {
    const state = get();
    return state.forceReadOnly[folderId] || false;
  },

  getChildren: (folderId) => {
    const state = get();
    if (folderId === null) {
      return state.rootItems.map(id => state.items[id]);
    }
    
    return Object.values(state.items).filter(item => 
      item.cardType === 'folder' ? 
        (item as FolderItem).parent === folderId : 
        (item as DocumentItem).folder?.id === folderId
    );
  },
  
  getPath: (itemId) => {
    const state = get();
    const path: FileSystemItem[] = [];
    let current = state.items[itemId];
    
    if (!current) return path;
    path.unshift(current);
    
    let parentId = current.cardType === 'folder' ? 
      (current as FolderItem).parent : 
      (current as DocumentItem).folder?.id;
    
    while (parentId) {
      const parent = state.items[parentId];
      if (!parent) break;
      
      path.unshift(parent);
      parentId = parent.cardType === 'folder' ? (parent as FolderItem).parent : null;
    }
    
    return path;
  },
  
  getFolderById: (folderId) => {
    const state = get();
    const folder = state.items[folderId];
    return folder && folder.cardType === 'folder' ? folder as FolderItem : undefined;
  },
  
  getItemById: (itemId) => {
    const state = get();
    return state.items[itemId];
  }
}));