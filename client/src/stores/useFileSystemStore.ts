import { produce } from 'immer';
import { create } from 'zustand';
import { FileSystemItem } from '@/types/folderDocumnet';

// Temporary adapter to help with the transition from title to name
const itemAdapter = (item: FileSystemItem): FileSystemItem => {
  // Make sure both title and name are available during transition
  if (!('title' in item) && 'name' in item) {
    (item as any).title = item.name;
  }
  if (!('name' in item) && 'title' in item) {
    (item as any).name = (item as any).title;
  }
  return item;
};

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
  getFolderById: (folderId: string) => FileSystemItem | undefined;
  getRootFolder: () => FileSystemItem | undefined;
  getItemById: (itemId: string) => FileSystemItem | undefined;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  items: {},
  rootItems: [],
  
  moveItem: (itemId, targetId) => set(produce((state) => {
    const item = state.items[itemId];
    if (!item) return;
    
    // Remove from current parent
    if (item.type === 'folder') {
      if (item.parent === null) {
        state.rootItems = state.rootItems.filter(id => id !== itemId);
      }
    } else {
      if (item.folder === null) {
        state.rootItems = state.rootItems.filter(id => id !== itemId);
      }
    }
    
    // Add to new parent
    if (targetId === null) {
      state.rootItems.push(itemId);
      if (item.type === 'folder') {
        item.parent = null;
      } else {
        item.folder = null;
      }
    } else {
      const targetItem = state.items[targetId];
      if (targetItem && targetItem.type === 'folder') {
        if (item.type === 'folder') {
          item.parent = targetId;
        } else {
          item.folder = targetId;
        }
      }
    }
  })),
  
  addItem: (item) => set(produce((state) => {
    state.items[item.id] = item;
    
    const isRootItem = item.type === 'folder' ? 
      item.parent === null : 
      item.folder === null;
      
    if (isRootItem && !state.rootItems.includes(item.id)) {
      state.rootItems.push(item.id);
    }
  })),
  
  removeItem: (itemId) => set(produce((state) => {
    const item = state.items[itemId];
    if (!item) return;
    
    // Remove from root items if applicable
    if (state.rootItems.includes(itemId)) {
      state.rootItems = state.rootItems.filter(id => id !== itemId);
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
    
    const folderChildren = Object.values(state.items).filter(item => {
      if (item.type === 'folder') {
        return item.parent === folderId;
      } else {
        return item.folder === folderId;
      }
    });
    
    return folderChildren;
  },
  
  getPath: (itemId) => {
    const state = get();
    const path: FileSystemItem[] = [];
    let current = state.items[itemId];
    
    if (!current) return path;
    path.unshift(current);
    
    let parentId = current.type === 'folder' ? current.parent : current.folder;
    
    while (parentId) {
      const parent = state.items[parentId];
      if (!parent) break;
      
      path.unshift(parent);
      parentId = parent.type === 'folder' ? parent.parent : null;
    }
    
    return path;
  },
  
  getFolderById: (folderId) => {
    const state = get();
    const folder = state.items[folderId];
    return folder && folder.type === 'folder' ? folder : undefined;
  },
  
  getRootFolder: () => {
    const state = get();
    return {
      id: 'root',
      name: 'Files',
      type: 'folder',
      owner: '',
      workspace: null,
      parent: null,
      path: '/',
      pathSegments: [],
      items: state.rootItems.length,
      isPinned: false,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    };
  },
  
  getItemById: (itemId) => {
    const state = get();
    return state.items[itemId];
  }
}));

// Initialize with updated data structure
export const initializeFileSystem = (data: any) => {
  // Clear existing state
  const store = useFileSystemStore.getState();
  
  // If data has the new structure with folderContents
  if (data?.data?.folderContents) {
    const { folders = [], files = [] } = data.data.folderContents;
    const allItems: Record<string, FileSystemItem> = {};
    const rootItemIds: string[] = [];
    
    // Process folders
    folders.forEach(folder => {
      // Apply adapter to ensure backward compatibility
      const adaptedFolder = itemAdapter(folder);
      allItems[adaptedFolder.id] = adaptedFolder;
      if (adaptedFolder.parent === null) {
        rootItemIds.push(adaptedFolder.id);
      }
    });
    
    // Process files
    files.forEach(file => {
      // Apply adapter to ensure backward compatibility
      const adaptedFile = itemAdapter(file);
      allItems[adaptedFile.id] = adaptedFile;
      if (adaptedFile.folder === null) {
        rootItemIds.push(adaptedFile.id);
      }
    });
    
    // Update store
    useFileSystemStore.setState({
      items: allItems,
      rootItems: rootItemIds
    });
  } else if (data.items && data.rootItems) {
    // Old format - apply adapter to all items for backward compatibility
    const adaptedItems: Record<string, FileSystemItem> = {};
    Object.entries(data.items).forEach(([id, item]) => {
      adaptedItems[id] = itemAdapter(item as FileSystemItem);
    });
    
    useFileSystemStore.setState({
      items: adaptedItems,
      rootItems: data.rootItems
    });
  }
};