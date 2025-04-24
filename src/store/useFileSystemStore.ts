import { produce } from 'immer';
import { create } from 'zustand';

// Types
export type FileSystemItemType = 'folder' | 'document';

export interface FileSystemItem {
  id: string;
  type: FileSystemItemType;
  title: string;
  parentId: string | null;
  color?: string;
  childCount?: number;
  byteCount?: number;
  fileExtension?: string;
  previewUrl?: string;
  isPinned?: boolean;
  children?: string[];
  size?: string;
  dateAdded?: string;
  dateModified?: string;
  dateOpened?: string;
}

interface FileSystemState {
  items: Record<string, FileSystemItem>;
  rootItems: string[]; // IDs of root level items
  
  // Actions
  moveItem: (itemId: string, targetId: string | null) => void;
  addItem: (item: FileSystemItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<FileSystemItem>) => void;
  
  // Helpers
  getChildren: (folderId: string | null) => FileSystemItem[];
  getPath: (itemId: string) => FileSystemItem[];
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  items: {},
  rootItems: [],
  
  moveItem: (itemId, targetId) => set(produce((state) => {
    const item = state.items[itemId];
    if (!item) return;
    
    // Remove from current parent
    if (item.parentId === null) {
      state.rootItems = state.rootItems.filter(id => id !== itemId);
    } else if (state.items[item.parentId]) {
      const parent = state.items[item.parentId];
      if (parent.children) {
        parent.children = parent.children.filter(id => id !== itemId);
      }
    }
    
    // Add to new parent
    if (targetId === null) {
      state.rootItems.push(itemId);
      item.parentId = null;
    } else {
      const targetItem = state.items[targetId];
      if (targetItem && targetItem.type === 'folder') {
        item.parentId = targetId;
        if (!targetItem.children) targetItem.children = [];
        if (!targetItem.children.includes(itemId)) {
          targetItem.children.push(itemId);
        }
        
        // Update item count
        targetItem.childCount = targetItem.children.length;
      }
    }
  })),
  
  addItem: (item) => set(produce((state) => {
    state.items[item.id] = item;
    
    if (item.parentId === null) {
      if (!state.rootItems.includes(item.id)) {
        state.rootItems.push(item.id);
      }
    } else if (state.items[item.parentId]) {
      const parent = state.items[item.parentId];
      if (!parent.children) parent.children = [];
      if (!parent.children.includes(item.id)) {
        parent.children.push(item.id);
        parent.childCount = parent.children.length;
      }
    }
  })),
  
  removeItem: (itemId) => set(produce((state) => {
    const item = state.items[itemId];
    if (!item) return;
    
    // Remove from parent
    if (item.parentId === null) {
      state.rootItems = state.rootItems.filter(id => id !== itemId);
    } else if (state.items[item.parentId]) {
      const parent = state.items[item.parentId];
      if (parent.children) {
        parent.children = parent.children.filter(id => id !== itemId);
        parent.childCount = parent.children.length;
      }
    }
    
    // Delete the item and its children recursively
    if (item.type === 'folder' && item.children) {
      for (const childId of item.children) {
        delete state.items[childId];
      }
    }
    
    delete state.items[itemId];
  })),
  
  updateItem: (itemId, updates) => set(produce((state) => {
    if (state.items[itemId]) {
      state.items[itemId] = { ...state.items[itemId], ...updates };
    }
  })),
  
  getChildren: (folderId) => {
    const state = get();
    if (folderId === null) {
      return state.rootItems.map(id => state.items[id]);
    }
    
    const folder = state.items[folderId];
    if (!folder || !folder.children) return [];
    
    return folder.children.map(id => state.items[id]);
  },
  
  getPath: (itemId) => {
    const state = get();
    const path: FileSystemItem[] = [];
    let current = state.items[itemId];
    
    while (current) {
      path.unshift(current);
      if (current.parentId === null) break;
      current = state.items[current.parentId];
    }
    
    return path;
  }
}));

// Initialize with sample data
export const initializeFileSystem = (data) => {
  const store = useFileSystemStore.getState();
  
  // If data provided is our JSON structure
  if (data.items && data.rootItems) {
    // Set items directly
    useFileSystemStore.setState({
      items: data.items,
      rootItems: data.rootItems
    });
  } else {
    // Fallback for the old format (an array of items)
    data.forEach(item => {
      store.addItem({
        ...item,
        parentId: null,
        children: item.type === 'folder' ? [] : undefined,
      });
    });
  }
};